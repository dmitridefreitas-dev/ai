import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const table = url.searchParams.get("table");
  const clinicId = staff.clinic_id;

  if (table === "call_logs") {
    const { data } = await serviceClient
      .from("call_logs")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(50);
    return Response.json({ data: data || [] });
  }

  if (table === "patients") {
    const { data } = await serviceClient
      .from("patients")
      .select("id, first_name, last_name, phone, email, intake_status, created_at")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(100);
    return Response.json({ data: data || [] });
  }

  if (table === "sms_messages") {
    const { data } = await serviceClient
      .from("sms_messages")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: clinic } = await serviceClient
      .from("clinics")
      .select("twilio_number")
      .eq("id", clinicId)
      .single();

    return Response.json({
      data: data || [],
      clinicId,
      twilioNumber: clinic?.twilio_number || "",
    });
  }

  if (table === "settings") {
    const { data: clinic } = await serviceClient
      .from("clinics")
      .select("business_hours, settings, google_oauth_tokens")
      .eq("id", clinicId)
      .single();

    return Response.json({
      clinicId,
      businessHours: clinic?.business_hours || {},
      settings: clinic?.settings || {},
      googleConnected: !!clinic?.google_oauth_tokens,
    });
  }

  if (table === "patient_detail") {
    const patientId = url.searchParams.get("id");
    if (!patientId) return Response.json({ error: "Missing patient id" }, { status: 400 });

    const { data: patient } = await serviceClient
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .eq("clinic_id", clinicId)
      .single();

    const { data: appointments } = await serviceClient
      .from("appointments")
      .select("id, datetime_start, type, status, duration_minutes")
      .eq("patient_id", patientId)
      .order("datetime_start", { ascending: false })
      .limit(20);

    return Response.json({ patient, appointments: appointments || [] });
  }

  return Response.json({ error: "Invalid table" }, { status: 400 });
}
