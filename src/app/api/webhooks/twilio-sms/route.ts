import { createServiceClient } from "@/lib/supabase/server";
import { getClinicByTwilioNumber } from "@/lib/retell";
import { sendSms } from "@/lib/twilio";

export async function POST(request: Request) {
  const formData = await request.formData();
  const from = formData.get("From") as string;
  const to = formData.get("To") as string;
  const body = (formData.get("Body") as string).trim();
  const messageSid = formData.get("MessageSid") as string;

  const clinic = await getClinicByTwilioNumber(to);
  if (!clinic) {
    return new Response("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const supabase = createServiceClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("clinic_id", clinic.id)
    .eq("phone", from)
    .single();

  await supabase.from("sms_messages").insert({
    clinic_id: clinic.id,
    patient_id: patient?.id ?? null,
    direction: "inbound",
    to_phone: to,
    from_phone: from,
    body,
    type: "confirmation",
    twilio_sid: messageSid,
  });

  const normalizedReply = body.toLowerCase().replace(/[^a-z]/g, "");

  if (["c", "confirm", "yes", "y"].includes(normalizedReply)) {
    if (patient) {
      const { data: appointment } = await supabase
        .from("appointments")
        .select("id")
        .eq("clinic_id", clinic.id)
        .eq("patient_id", patient.id)
        .in("status", ["scheduled"])
        .gte("datetime_start", new Date().toISOString())
        .order("datetime_start", { ascending: true })
        .limit(1)
        .single();

      if (appointment) {
        await supabase
          .from("appointments")
          .update({
            status: "confirmed",
            confirmation_reply: body,
            updated_at: new Date().toISOString(),
          })
          .eq("id", appointment.id);

        await sendSms({
          to: from,
          from: to,
          body: `Confirmed! See you at ${clinic.name}. If you need to reschedule, please call us at ${clinic.phone}.`,
          clinicId: clinic.id,
          patientId: patient.id,
          type: "confirmation",
        });
      }
    }
  } else if (["r", "reschedule", "cancel"].includes(normalizedReply)) {
    await sendSms({
      to: from,
      from: to,
      body: `To reschedule your appointment at ${clinic.name}, please call us at ${clinic.phone} and we'll find a new time for you.`,
      clinicId: clinic.id,
      patientId: patient?.id,
      type: "confirmation",
    });
  }

  return new Response("<Response></Response>", {
    headers: { "Content-Type": "text/xml" },
  });
}
