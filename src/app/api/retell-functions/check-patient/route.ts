import { getClinicFromCall, RetellFunctionRequest, retellResponse } from "@/lib/retell";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
  const body: RetellFunctionRequest = await request.json();
  const { call: callObj, args } = body;

  const clinic = await getClinicFromCall(callObj);
  if (!clinic) {
    return retellResponse({ error: "Clinic not found" });
  }

  const phone = args.patient_phone as string | undefined;
  const name = args.patient_name as string | undefined;

  const supabase = createServiceClient();

  let patient = null;

  if (phone) {
    const { data } = await supabase
      .from("patients")
      .select("*")
      .eq("clinic_id", clinic.id)
      .eq("phone", phone)
      .single();
    patient = data;
  }

  if (!patient && name) {
    const { data } = await supabase
      .from("patients")
      .select("*")
      .eq("clinic_id", clinic.id)
      .ilike("first_name", `%${name.split(" ")[0]}%`)
      .limit(1)
      .single();
    patient = data;
  }

  if (!patient) {
    return retellResponse({
      found: false,
      message: "I don't have a record for that patient. Would you like to book as a new patient?",
    });
  }

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("patient_id", patient.id)
    .gte("datetime_start", new Date().toISOString())
    .in("status", ["scheduled", "confirmed"])
    .order("datetime_start", { ascending: true })
    .limit(3);

  const upcomingAppointments = (appointments || []).map((a) => ({
    date: new Date(a.datetime_start).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: clinic.timezone,
    }),
    time: new Date(a.datetime_start).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: clinic.timezone,
    }),
    type: a.type,
    status: a.status,
  }));

  return retellResponse({
    found: true,
    patient_name: `${patient.first_name} ${patient.last_name}`,
    upcoming_appointments: upcomingAppointments,
    intake_completed: patient.intake_status === "completed",
    message:
      upcomingAppointments.length > 0
        ? `I found ${patient.first_name} ${patient.last_name}. They have ${upcomingAppointments.length} upcoming appointment(s). The next one is on ${upcomingAppointments[0].date} at ${upcomingAppointments[0].time}.`
        : `I found ${patient.first_name} ${patient.last_name}, but they don't have any upcoming appointments.`,
  });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return retellResponse({ error: "check-patient crashed", message });
  }
}
