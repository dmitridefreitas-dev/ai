import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/twilio";
import { sendEmail } from "@/lib/resend";

export async function GET(request: NextRequest) {
  if (
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const now = new Date();
  const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .gte("datetime_start", in23h.toISOString())
    .lte("datetime_start", in25h.toISOString())
    .is("reminder_sent_at", null)
    .in("status", ["scheduled", "confirmed"]);

  if (!appointments || appointments.length === 0) {
    return Response.json({ sent: 0 });
  }

  let sent = 0;

  for (const appt of appointments) {
    const { data: patient } = await supabase
      .from("patients")
      .select("*")
      .eq("id", appt.patient_id)
      .single();

    const { data: clinic } = await supabase
      .from("clinics")
      .select("*")
      .eq("id", appt.clinic_id)
      .single();

    if (!patient || !clinic) continue;

    const tz = clinic.timezone || "America/Barbados";
    const formattedTime = new Date(appt.datetime_start).toLocaleTimeString(
      "en-US",
      { hour: "numeric", minute: "2-digit", timeZone: tz }
    );
    const formattedDate = new Date(appt.datetime_start).toLocaleDateString(
      "en-US",
      { weekday: "long", month: "long", day: "numeric", timeZone: tz }
    );

    await sendSms({
      to: patient.phone,
      from: clinic.twilio_number,
      body: `Hi ${patient.first_name}, reminder: your appointment at ${clinic.name} is ${formattedDate} at ${formattedTime}. Reply C to confirm or R to reschedule.`,
      clinicId: clinic.id,
      patientId: patient.id,
      type: "reminder",
    });

    if (patient.email) {
      await sendEmail({
        to: patient.email,
        subject: `Appointment Reminder - ${clinic.name}`,
        html: `
          <h2>Appointment Reminder</h2>
          <p>Hi ${patient.first_name},</p>
          <p>This is a reminder that your appointment at <strong>${clinic.name}</strong> is scheduled for:</p>
          <p style="font-size: 18px;"><strong>${formattedDate} at ${formattedTime}</strong></p>
          <p>If you need to reschedule, please call us at ${clinic.phone}.</p>
          <p>See you soon!</p>
        `,
        clinicId: clinic.id,
        patientId: patient.id,
        type: "reminder",
        templateUsed: "appointment_reminder",
      });
    }

    await supabase
      .from("appointments")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", appt.id);

    sent++;
  }

  return Response.json({ sent });
}
