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

    const recipientPhone = args.recipient_phone as string;
    const message = args.message as string;

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
    const message = err instanceof Error ? err.message : String(err);
    return retellResponse({ error: "send-sms crashed", message });
  }
}
