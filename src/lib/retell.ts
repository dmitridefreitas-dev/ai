import { createServiceClient } from "@/lib/supabase/server";
import { Clinic } from "@/lib/types/database";

export async function getClinicFromCall(
  call: RetellCallObject
): Promise<Clinic | null> {
  const agentId = call.agent_id;
  if (!agentId) return null;

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

export type RetellCallObject = {
  agent_id: string;
  call_id: string;
  [key: string]: unknown;
};

export type RetellFunctionRequest = {
  name: string;
  call: RetellCallObject;
  args: Record<string, unknown>;
};

export function retellResponse(result: Record<string, unknown>) {
  return Response.json({ result });
}
