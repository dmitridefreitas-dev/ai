import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json();
  const event = body.event;

  if (event === "call.ended" || event === "call.analyzed") {
    const call = body.data || body.call;
    const supabase = createServiceClient();

    const agentId = call.agent_id;
    const { data: clinic } = await supabase
      .from("clinics")
      .select("id")
      .eq("retell_agent_id", agentId)
      .single();

    if (!clinic) {
      return Response.json({ error: "Clinic not found" }, { status: 404 });
    }

    const callerPhone = call.from_number || call.caller_number || "";

    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("clinic_id", clinic.id)
      .eq("phone", callerPhone)
      .single();

    const { data: existing } = await supabase
      .from("call_logs")
      .select("id")
      .eq("retell_call_id", call.call_id)
      .single();

    const outcome = categorizeOutcome(call);

    if (existing) {
      await supabase
        .from("call_logs")
        .update({
          duration_seconds: call.duration_ms ? Math.round(call.duration_ms / 1000) : 0,
          transcript: call.transcript || null,
          recording_url: call.recording_url || null,
          actions_taken: JSON.parse(JSON.stringify(call.function_calls || [])),
          outcome,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("call_logs").insert({
        clinic_id: clinic.id,
        patient_id: patient?.id ?? null,
        retell_call_id: call.call_id,
        caller_phone: callerPhone,
        direction: call.direction || "inbound",
        duration_seconds: call.duration_ms ? Math.round(call.duration_ms / 1000) : 0,
        recording_url: call.recording_url || null,
        transcript: call.transcript || null,
        actions_taken: JSON.parse(JSON.stringify(call.function_calls || [])),
        outcome,
      });
    }
  }

  return Response.json({ received: true });
}

function categorizeOutcome(
  call: Record<string, unknown>
): string {
  const functions = (call.function_calls as Array<{ name: string }>) || [];
  const functionNames = functions.map((f) => f.name);

  if (functionNames.includes("book_appointment") || functionNames.includes("book-appointment")) return "booked";
  if (functionNames.includes("transfer_call") || functionNames.includes("transfer-call")) return "transferred";
  if (call.disconnection_reason === "no_answer" || call.status === "missed") return "missed";
  if (call.disconnection_reason === "voicemail") return "voicemail";
  return "info_only";
}
