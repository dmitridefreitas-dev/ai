import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TodayAppointments } from "./today-appointments";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("clinic_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!staff) redirect("/login");

  const clinicId = staff.clinic_id;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const [appointmentsRes, callsRes, noShowsRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, datetime_start, datetime_end, type, status, duration_minutes, source, patient_id")
      .eq("clinic_id", clinicId)
      .gte("datetime_start", todayStart)
      .lt("datetime_start", todayEnd)
      .order("datetime_start", { ascending: true }),
    supabase
      .from("call_logs")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .gte("created_at", todayStart),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("status", "no_show")
      .gte("datetime_start", todayStart)
      .lt("datetime_start", todayEnd),
  ]);

  const rawAppointments = appointmentsRes.data || [];
  const callCount = callsRes.count || 0;
  const noShowCount = noShowsRes.count || 0;

  const patientIds = [...new Set(rawAppointments.map((a) => a.patient_id))];
  const { data: patients } = patientIds.length > 0
    ? await supabase
        .from("patients")
        .select("id, first_name, last_name, phone")
        .in("id", patientIds)
    : { data: [] };

  const patientMap = new Map((patients || []).map((p) => [p.id, p]));

  const appointments = rawAppointments.map((a) => {
    const p = patientMap.get(a.patient_id);
    return {
      id: a.id,
      datetime_start: a.datetime_start,
      datetime_end: a.datetime_end,
      type: a.type,
      status: a.status,
      duration_minutes: a.duration_minutes,
      source: a.source,
      patient_name: p ? `${p.first_name} ${p.last_name}` : "Unknown",
      patient_phone: p?.phone || "",
    };
  });

  const confirmed = appointments.filter(
    (a) => a.status === "confirmed" || a.status === "checked_in" || a.status === "completed"
  ).length;

  const stats = [
    { label: "Appointments Today", value: appointments.length },
    { label: "Calls Today", value: callCount },
    { label: "Confirmed", value: confirmed },
    { label: "No-Shows", value: noShowCount },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-lg">Today&apos;s Appointments</h2>
        </div>
        <TodayAppointments initialAppointments={appointments} clinicId={clinicId} />
      </div>
    </div>
  );
}
