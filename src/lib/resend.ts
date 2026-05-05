import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/server";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!);
  return _resend;
}

export async function sendEmail({
  to,
  subject,
  html,
  clinicId,
  patientId,
  type,
  templateUsed,
}: {
  to: string;
  subject: string;
  html: string;
  clinicId: string;
  patientId?: string;
  type: string;
  templateUsed: string;
}) {
  const { data, error } = await getResend().emails.send({
    from: "AI Receptionist <noreply@yourdomain.com>",
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  const supabase = createServiceClient();
  await supabase.from("email_messages").insert({
    clinic_id: clinicId,
    patient_id: patientId ?? null,
    to_email: to,
    subject,
    type,
    template_used: templateUsed,
    sent_at: new Date().toISOString(),
  });

  return data;
}
