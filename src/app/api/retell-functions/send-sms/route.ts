import { getClinicFromCall, RetellFunctionRequest, retellResponse } from "@/lib/retell";
import { sendSms } from "@/lib/twilio";

export async function POST(request: Request) {
  try {
    const body: RetellFunctionRequest = await request.json();
    const { call: callObj, args } = body;

    const clinic = await getClinicFromCall(callObj);
    if (!clinic) {
      return retellResponse({ error: "Clinic not found" });
    }

    const recipientPhone = args.recipient_phone as string | undefined;
    const message = args.message as string | undefined;

    if (!recipientPhone || !message) {
      return retellResponse({
        error: "Missing information",
        message: "I need the recipient's phone number and the message to send.",
      });
    }

    await sendSms({
      to: recipientPhone,
      from: clinic.twilio_number,
      body: message,
      clinicId: clinic.id,
      type: "manual",
    });

    return retellResponse({
      success: true,
      message: `SMS sent to ${recipientPhone}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return retellResponse({ error: "send-sms failed", message: msg });
  }
}
