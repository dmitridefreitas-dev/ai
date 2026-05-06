import { createClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/twilio";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: staff } = await supabase
    .from("staff")
    .select("clinic_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!staff) {
    return Response.json({ error: "Staff not found" }, { status: 403 });
  }

  const body = await request.json();
  const { to, body: messageBody, from, type } = body;

  try {
    const message = await sendSms({
      to,
      from,
      body: messageBody,
      clinicId: staff.clinic_id,
      type: type || "manual",
    });

    return Response.json({ success: true, sid: message.sid });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send SMS";
    return Response.json({ error: msg }, { status: 500 });
  }
}
