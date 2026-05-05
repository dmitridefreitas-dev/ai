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
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const { data: noShows } = await supabase
    .from("appointments")
    .select("*")
    .lt("datetime_start", thirtyMinAgo.toISOString())
    .gt("datetime_start", oneDayAgo.toISOString())
    .eq("status", "scheduled");

  let markedNoShow = 0;

  for (const appt of noShows || []) {
    const { data: patient } = await supabase
      .from("patients").select("*").eq("id", appt.patient_id).single();
    const { data: clinic } = await supabase
      .from("clinics").select("*").eq("id", appt.clinic_id).single();
    if (!patient || !clinic) continue;

    await supabase
      .from("appointments")
      .update({ status: "no_show", updated_at: now.toISOString() })
      .eq("id", appt.id);

    await sendSms({
      to: patient.phone,
      from: clinic.twilio_number,
      body: `We missed you at your appointment at ${clinic.name} today. Would you like to rebook? Reply YES or call us at ${clinic.phone}.`,
      clinicId: clinic.id,
      patientId: patient.id,
      type: "noshow_outreach",
    });

    markedNoShow++;
  }

  const { data: staleNoShows } = await supabase
    .from("appointments")
    .select("*")
    .eq("status", "no_show")
    .lt("updated_at", fourHoursAgo.toISOString())
    .gt("datetime_start", twoDaysAgo.toISOString());

  let emailsSent = 0;

  for (const appt of staleNoShows || []) {
    const { data: patient } = await supabase
      .from("patients").select("*").eq("id", appt.patient_id).single();
    const { data: clinic } = await supabase
      .from("clinics").select("*").eq("id", appt.clinic_id).single();
    if (!patient || !clinic || !patient.email) continue;

    const { data: existingEmail } = await supabase
      .from("email_messages")
      .select("id")
      .eq("patient_id", patient.id)
      .eq("type", "noshow_followup")
      .gte("sent_at", twoDaysAgo.toISOString())
      .limit(1)
      .single();

    if (existingEmail) continue;

    await sendEmail({
      to: patient.email,
      subject: `We Missed You - ${clinic.name}`,
      html: `
        <h2>We missed you today!</h2>
        <p>Hi ${patient.first_name},</p>
        <p>We noticed you weren't able to make your appointment at <strong>${clinic.name}</strong>.</p>
        <p>We'd love to reschedule at a time that works better for you. Please call us at <strong>${clinic.phone}</strong> to book a new appointment.</p>
        <p>We look forward to seeing you soon.</p>
      `,
      clinicId: clinic.id,
      patientId: patient.id,
      type: "noshow_followup",
      templateUsed: "noshow_followup",
    });

    emailsSent++;
  }

  return Response.json({ markedNoShow, emailsSent });
}
