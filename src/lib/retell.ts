import { createServiceClient } from "@/lib/supabase/server";
import { Clinic } from "@/lib/types/database";

export async function getClinicFromCall(
  callId: string
): Promise<Clinic | null> {
  const response = await fetch(`https://api.retellai.com/v2/get-call/${callId}`, {
    headers: {
      Authorization: `Bearer ${process.env.RETELL_API_KEY!}`,
    },
  });

  if (!response.ok) return null;

  const call = await response.json();
  const agentId = call.agent_id;

  const supabase = createServiceClient();
  const { data: clinic } = await supabase
    .from("clinics")
    .select("*")
    .eq("retell_agent_id", agentId)
    .single();

  return clinic;
}

export async function getClinicByTwilioNumber(
  phoneNumber: string
): Promise<Clinic | null> {
  const supabase = createServiceClient();
  const { data: clinic } = await supabase
    .from("clinics")
    .select("*")
    .eq("twilio_number", phoneNumber)
    .single();

  return clinic;
}

export type RetellFunctionRequest = {
  call_id: string;
  args: Record<string, unknown>;
};

export function retellResponse(result: Record<string, unknown>) {
  return Response.json({ result });
}
