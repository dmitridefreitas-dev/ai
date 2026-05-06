"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type PatientDetail = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  insurance_info: unknown;
  intake_status: string;
  notes: string | null;
  created_at: string;
};

type AppointmentRow = {
  id: string;
  datetime_start: string;
  type: string;
  status: string;
  duration_minutes: number;
};

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ id }) => loadPatient(id));
  }, [params]);

  async function loadPatient(id: string) {
    const supabase = createClient();

    const { data: p } = await supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .single();

    if (!p) {
      setLoading(false);
      return;
    }

    const { data: appts } = await supabase
      .from("appointments")
      .select("id, datetime_start, type, status, duration_minutes")
      .eq("patient_id", id)
      .order("datetime_start", { ascending: false })
      .limit(20);

    setPatient(p);
    setAppointments(appts || []);
    setLoading(false);
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading patient...</div>;
  }

  if (!patient) {
    return <div className="p-8 text-center text-red-500">Patient not found.</div>;
  }

  const insurance = (patient.insurance_info || null) as Record<string, string> | null;
  const upcoming = appointments.filter(
    (a) => new Date(a.datetime_start) >= new Date() && a.status !== "cancelled"
  );
  const past = appointments.filter(
    (a) => new Date(a.datetime_start) < new Date() || a.status === "cancelled"
  );

  const statusColors: Record<string, string> = {
    scheduled: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    checked_in: "bg-green-100 text-green-800",
    completed: "bg-gray-100 text-gray-600",
    no_show: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-400",
  };

  return (
    <div>
      <Link href="/dashboard/patients" className="text-sm text-sky-500 hover:text-sky-600 mb-4 inline-block">
        &larr; Back to Patients
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="font-semibold text-lg mb-4">
              {patient.first_name} {patient.last_name}
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500">Phone:</span>
                <span className="ml-2">{patient.phone}</span>
              </div>
              <div>
                <span className="text-gray-500">Email:</span>
                <span className="ml-2">{patient.email || "—"}</span>
              </div>
              <div>
                <span className="text-gray-500">DOB:</span>
                <span className="ml-2">{patient.date_of_birth || "—"}</span>
              </div>
              <div>
                <span className="text-gray-500">Intake:</span>
                <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                  patient.intake_status === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                }`}>
                  {patient.intake_status}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Patient since:</span>
                <span className="ml-2">
                  {new Date(patient.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          {insurance && (insurance.provider || insurance.number) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h3 className="font-semibold mb-3">Insurance</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Provider:</span>
                  <span className="ml-2">{insurance.provider || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Policy #:</span>
                  <span className="ml-2">{insurance.number || "—"}</span>
                </div>
              </div>
            </div>
          )}

          {patient.notes && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h3 className="font-semibold mb-3">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{patient.notes}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold">Upcoming Appointments ({upcoming.length})</h3>
            </div>
            {upcoming.length === 0 ? (
              <div className="p-5 text-sm text-gray-400">No upcoming appointments.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {upcoming.map((a) => (
                    <tr key={a.id}>
                      <td className="px-5 py-3 text-sm">
                        {new Date(a.datetime_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-5 py-3 text-sm">
                        {new Date(a.datetime_start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-3 text-sm capitalize">{a.type}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[a.status] || "bg-gray-100 text-gray-600"}`}>
                          {a.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold">Visit History ({past.length})</h3>
            </div>
            {past.length === 0 ? (
              <div className="p-5 text-sm text-gray-400">No past visits.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Time</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {past.map((a) => (
                    <tr key={a.id}>
                      <td className="px-5 py-3 text-sm">
                        {new Date(a.datetime_start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-5 py-3 text-sm">
                        {new Date(a.datetime_start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-3 text-sm capitalize">{a.type}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[a.status] || "bg-gray-100 text-gray-600"}`}>
                          {a.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
