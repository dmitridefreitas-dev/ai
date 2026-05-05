import twilio from "twilio";
import { createServiceClient } from "@/lib/supabase/server";

let _client: ReturnType<typeof twilio> | null = null;
function getTwilioClient() {
  if (!_client) {
    _client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
  }
  return _client;
}

export async function sendSms({
  to,
  from,
  body,
  clinicId,
  patientId,
  type,
}: {
  to: string;
  from: string;
  body: string;
  clinicId: string;
  patientId?: string;
  type: "reminder" | "confirmation" | "noshow_outreach" | "checkin" | "manual" | "intake";
}) {
  const message = await getTwilioClient().messages.create({ to, from, body });

  const supabase = createServiceClient();
  await supabase.from("sms_messages").insert({
    clinic_id: clinicId,
    patient_id: patientId ?? null,
    direction: "outbound",
    to_phone: to,
    from_phone: from,
    body,
    type,
    twilio_sid: message.sid,
  });

  return message;
}

export function validateTwilioWebhook(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature,
    url,
    params
  );
}
