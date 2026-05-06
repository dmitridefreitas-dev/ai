"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type PatientRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  intake_status: string;
  created_at: string;
};

const intakeColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  sent: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) return;

      const { data: staffRow } = await supabase
        .from("staff")
        .select("clinic_id")
        .eq("auth_user_id", authUser.user.id)
        .single();

      if (!staffRow) return;

      const { data } = await supabase
        .from("patients")
        .select("id, first_name, last_name, phone, email, intake_status, created_at")
        .eq("clinic_id", staffRow.clinic_id)
        .order("created_at", { ascending: false })
        .limit(100);

      setPatients(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading patients...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Patients</h1>
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-72"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {search ? "No patients match your search." : "No patients yet."}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Intake</th>
                <th className="px-5 py-3">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/dashboard/patients/${patient.id}`}
                      className="text-sm font-medium text-sky-600 hover:text-sky-700"
                    >
                      {patient.first_name} {patient.last_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{patient.phone}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{patient.email || "—"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        intakeColors[patient.intake_status] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {patient.intake_status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {new Date(patient.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
