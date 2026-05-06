"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AppointmentRow = {
  id: string;
  datetime_start: string;
  datetime_end: string;
  type: string;
  status: string;
  duration_minutes: number;
  source: string;
  patient_name: string;
  patient_phone: string;
};

const statusColors: Record<string, string> = {
  scheduled: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  checked_in: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-600",
  no_show: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-400",
};

export function TodayAppointments({
  initialAppointments,
  clinicId,
}: {
  initialAppointments: AppointmentRow[];
  clinicId: string;
}) {
  const [appointments, setAppointments] = useState(initialAppointments);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("appointments-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `clinic_id=eq.${clinicId}`,
        },
        async () => {
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
          const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

          const { data: rawAppts } = await supabase
            .from("appointments")
            .select("id, datetime_start, datetime_end, type, status, duration_minutes, source, patient_id")
            .eq("clinic_id", clinicId)
            .gte("datetime_start", todayStart)
            .lt("datetime_start", todayEnd)
            .order("datetime_start", { ascending: true });

          if (!rawAppts) return;

          const patientIds = [...new Set(rawAppts.map((a) => a.patient_id))];
          const { data: patients } = patientIds.length > 0
            ? await supabase.from("patients").select("id, first_name, last_name, phone").in("id", patientIds)
            : { data: [] };

          const patientMap = new Map((patients || []).map((p) => [p.id, p]));

          setAppointments(
            rawAppts.map((a) => {
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
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId]);

  if (appointments.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        No appointments scheduled for today.
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
          <th className="px-5 py-3">Time</th>
          <th className="px-5 py-3">Patient</th>
          <th className="px-5 py-3">Type</th>
          <th className="px-5 py-3">Duration</th>
          <th className="px-5 py-3">Source</th>
          <th className="px-5 py-3">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {appointments.map((appt) => (
          <tr key={appt.id} className="hover:bg-gray-50">
            <td className="px-5 py-3 text-sm font-medium">
              {new Date(appt.datetime_start).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </td>
            <td className="px-5 py-3 text-sm">{appt.patient_name}</td>
            <td className="px-5 py-3 text-sm text-gray-600 capitalize">{appt.type}</td>
            <td className="px-5 py-3 text-sm text-gray-600">{appt.duration_minutes} min</td>
            <td className="px-5 py-3 text-sm text-gray-600">{appt.source}</td>
            <td className="px-5 py-3">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  statusColors[appt.status] || "bg-gray-100 text-gray-600"
                }`}
              >
                {appt.status.replace("_", " ")}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
