import { getClinicFromCall, RetellFunctionRequest, retellResponse } from "@/lib/retell";
import { getAvailableSlots } from "@/lib/google-calendar";
import { ClinicSettings } from "@/lib/types/database";

export async function POST(request: Request) {
  const body: RetellFunctionRequest = await request.json();
  const { call: callObj, args } = body;

  const clinic = await getClinicFromCall(callObj);
  if (!clinic) {
    return retellResponse({ error: "Clinic not found" });
  }

  const date = args.date as string;
  const appointmentType = args.appointment_type as string | undefined;

  const settings = clinic.settings as unknown as ClinicSettings;
  const typeConfig = settings.appointment_types.find(
    (t) => t.name.toLowerCase() === (appointmentType || "").toLowerCase()
  );
  const duration = typeConfig?.duration_minutes ?? 30;

  const slots = await getAvailableSlots(clinic, date, duration);

  if (slots.length === 0) {
    return retellResponse({
      available: false,
      message: `No available slots on ${date}. Would you like to check another day?`,
    });
  }

  const topSlots = slots.slice(0, 5);

  return retellResponse({
    available: true,
    slots: topSlots.map((s) => s.start),
    message: `Available times on ${date}: ${topSlots.map((s) => s.start).join(", ")}`,
  });
}
