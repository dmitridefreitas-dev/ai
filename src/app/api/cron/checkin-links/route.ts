import { v4 as uuidv4 } from "uuid";
import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/twilio";

export async function GET(request: NextRequest) {
  if (
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .gte("datetime_start", todayStart.toISOString())
    .lte("datetime_start", todayEnd.toISOString())
    .in("status", ["confirmed", "scheduled"])
    .is("checkin_token", null);

  if (!appointments || appointments.length === 0) {
    return Response.json({ sent: 0 });
  }

  let sent = 0;

  for (const appt of appointments) {
    const { data: patient } = await supabase
      .from("patients").select("*").eq("id", appt.patient_id).single();
    const { data: clinic } = await supabase
      .from("clinics").select("*").eq("id", appt.clinic_id).single();
    if (!patient || !clinic) continue;

    const checkinToken = uuidv4();
    const checkinUrl = `${process.env.NEXT_PUBLIC_APP_URL}/checkin/${checkinToken}`;

    await supabase
      .from("appointments")
      .update({ checkin_token: checkinToken })
      .eq("id", appt.id);

    const formattedTime = new Date(appt.datetime_start).toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
        timeZone: clinic.timezone || "America/Barbados",
      }
    );

    await sendSms({
      to: patient.phone,
      from: clinic.twilio_number,
      body: `Your appointment at ${clinic.name} is today at ${formattedTime}. Check in early here: ${checkinUrl}`,
      clinicId: clinic.id,
      patientId: patient.id,
      type: "checkin",
    });

    sent++;
  }

  return Response.json({ sent });
}
