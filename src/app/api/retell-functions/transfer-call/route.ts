import { getClinicFromCall, RetellFunctionRequest, retellResponse } from "@/lib/retell";
import { ClinicSettings } from "@/lib/types/database";

export async function POST(request: Request) {
  const body: RetellFunctionRequest = await request.json();
  const { call_id, args } = body;

  const clinic = await getClinicFromCall(call_id);
  if (!clinic) {
    return retellResponse({ error: "Clinic not found" });
  }

  const target = (args.transfer_target as string).toLowerCase();
  const settings = clinic.settings as unknown as ClinicSettings;
  const transferNumbers = settings.transfer_numbers;

  const number = transferNumbers[target] || transferNumbers["default"];

  if (!number) {
    return retellResponse({
      success: false,
      message: "I'm sorry, I don't have a transfer number for that department. Let me take a message instead.",
    });
  }

  return retellResponse({
    success: true,
    transfer_number: number,
    message: `Transferring you now to ${target}. Please hold.`,
  });
}
