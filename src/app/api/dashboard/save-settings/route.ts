import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { data: staff } = await serviceClient
    .from("staff")
    .select("clinic_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!staff) {
    return Response.json({ error: "Staff not found" }, { status: 403 });
  }

  const body = await request.json();
  const { businessHours, settings } = body;

  await serviceClient
    .from("clinics")
    .update({
      business_hours: JSON.parse(JSON.stringify(businessHours)),
      settings: JSON.parse(JSON.stringify(settings)),
    })
    .eq("id", staff.clinic_id);

  return Response.json({ success: true });
}
