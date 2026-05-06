import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const event = body.event;
    const call = body.call || body.data || body;

    if (event !== "call_ended" && event !== "call_analyzed") {
      return Response.json({ received: true, skipped: event });
    }

    const supabase = createServiceClient();

    const agentId = call.agent_id;
    if (!agentId) {
      return Response.json({ error: "No agent_id in payload" }, { status: 400 });
    }

    const { data: clinic } = await supabase
      .from("clinics")
      .select("id")
      .eq("retell_agent_id", agentId)
      .single();

    if (!clinic) {
      return Response.json({ error: "Clinic not found" }, { status: 404 });
    }

    const callerPhone = call.from_number || call.caller_number || "";
    const callId = call.call_id || "";

    let durationSeconds = 0;
    if (call.start_timestamp && call.end_timestamp) {
      durationSeconds = Math.round((call.end_timestamp - call.start_timestamp) / 1000);
    }

    const transcript = call.transcript || null;
    const recordingUrl = call.recording_url || null;

    const { data: patient } = callerPhone
      ? await supabase
          .from("patients")
          .select("id")
          .eq("clinic_id", clinic.id)
          .eq("phone", callerPhone)
          .single()
      : { data: null };

    const outcome = categorizeOutcome(call);

    const { data: existing } = await supabase
      .from("call_logs")
      .select("id")
      .eq("retell_call_id", callId)
      .single();

    const toolCalls = call.transcript_with_tool_calls || call.function_calls || [];

    if (existing) {
      await supabase
        .from("call_logs")
        .update({
          duration_seconds: durationSeconds,
          transcript,
          recording_url: recordingUrl,
          actions_taken: JSON.parse(JSON.stringify(toolCalls)),
          outcome,
          patient_id: patient?.id ?? null,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("call_logs").insert({
        clinic_id: clinic.id,
        patient_id: patient?.id ?? null,
        retell_call_id: callId,
        caller_phone: callerPhone,
        direction: call.direction || "inbound",
        duration_seconds: durationSeconds,
        recording_url: recordingUrl,
        transcript,
        actions_taken: JSON.parse(JSON.stringify(toolCalls)),
        outcome,
      });
    }

    return Response.json({ received: true, event, callId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "webhook failed", message: msg }, { status: 500 });
  }
}

function categorizeOutcome(call: Record<string, unknown>): string {
  const toolCalls = (call.transcript_with_tool_calls || call.function_calls || []) as Array<Record<string, unknown>>;
  const names = toolCalls
    .filter((t) => t.role === "tool_call_invocation" || t.name)
    .map((t) => (t.name || t.function_name || "") as string);

  if (names.some((n) => n.includes("book"))) return "booked";
  if (names.some((n) => n.includes("transfer"))) return "transferred";
  if (call.disconnection_reason === "no_answer" || call.call_status === "missed") return "missed";
  if (call.disconnection_reason === "voicemail_reached") return "voicemail";
  return "info_only";
}
