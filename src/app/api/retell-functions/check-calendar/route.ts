import { getClinicFromCall, RetellFunctionRequest, retellResponse } from "@/lib/retell";
import { getAvailableSlots } from "@/lib/google-calendar";
import { ClinicSettings } from "@/lib/types/database";

export async function POST(request: Request) {
  try {
    const body: RetellFunctionRequest = await request.json();
    const { call: callObj, args } = body;

    const clinic = await getClinicFromCall(callObj);
    if (!clinic) {
      return retellResponse({ error: "Clinic not found" });
    }

    let date = args.date as string | undefined;
    if (!date) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      date = tomorrow.toISOString().split("T")[0];
    }
    if (date && !date.includes("-")) {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        date = parsed.toISOString().split("T")[0];
      }
    }

    const appointmentType = args.appointment_type as string | undefined;

    const settings = clinic.settings as unknown as ClinicSettings;
    const typeConfig = appointmentType
      ? settings.appointment_types.find(
          (t) => t.name.toLowerCase() === appointmentType.toLowerCase()
        )
      : undefined;
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
      date,
      slots: topSlots.map((s) => s.start),
      message: `Available times on ${date}: ${topSlots.map((s) => s.start).join(", ")}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return retellResponse({ error: "check-calendar failed", message: msg });
  }
}
