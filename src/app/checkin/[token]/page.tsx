"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type AppointmentInfo = {
  id: string;
  datetime_start: string;
  type: string;
  clinic_name: string;
  clinic_phone: string;
  patient_name: string;
  patient_phone: string;
  clinic_timezone: string;
};

export default function CheckInPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<AppointmentInfo | null>(null);
  const [apptId, setApptId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"verify" | "confirm" | "done">("verify");
  const [lastFour, setLastFour] = useState("");

  useEffect(() => {
    params.then(({ token }) => loadAppointment(token));
  }, [params]);

  async function loadAppointment(token: string) {
    const supabase = createClient();

    const { data: appt } = await supabase
      .from("appointments")
      .select("id, datetime_start, type, status, clinic_id, patient_id")
      .eq("checkin_token", token)
      .single();

    if (!appt) {
      setError("Invalid or expired check-in link.");
      setLoading(false);
      return;
    }

    if (appt.status === "checked_in" || appt.status === "completed") {
      setStep("done");
    }

    setApptId(appt.id);

    const { data: clinic } = await supabase
      .from("clinics")
      .select("name, phone, timezone")
      .eq("id", appt.clinic_id)
      .single();

    const { data: patient } = await supabase
      .from("patients")
      .select("first_name, last_name, phone")
      .eq("id", appt.patient_id)
      .single();

    if (!clinic || !patient) {
      setError("Could not load appointment details.");
      setLoading(false);
      return;
    }

    setAppointment({
      id: appt.id,
      datetime_start: appt.datetime_start,
      type: appt.type,
      clinic_name: clinic.name,
      clinic_phone: clinic.phone,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      patient_phone: patient.phone,
      clinic_timezone: clinic.timezone || "America/Barbados",
    });
    setLoading(false);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!appointment) return;

    const phoneLast4 = appointment.patient_phone.slice(-4);
    if (lastFour !== phoneLast4) {
      setError("Phone number doesn't match our records. Please try again.");
      return;
    }
    setError(null);
    setStep("confirm");
  }

  async function handleCheckIn() {
    if (!apptId) return;

    const supabase = createClient();
    await supabase
      .from("appointments")
      .update({
        status: "checked_in",
        checkin_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", apptId);

    setStep("done");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md text-center p-8">
          <div className="text-green-500 text-5xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold mb-2">You&apos;re Checked In!</h1>
          <p className="text-gray-600">
            {appointment?.clinic_name} has been notified. Please have a seat and
            we&apos;ll be with you shortly.
          </p>
        </div>
      </div>
    );
  }

  const formattedTime = appointment
    ? new Date(appointment.datetime_start).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: appointment.clinic_timezone,
      })
    : "";

  if (step === "verify") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
          <h1 className="text-xl font-bold mb-1">
            Check In - {appointment?.clinic_name}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            Appointment at {formattedTime} for {appointment?.type}
          </p>

          <form onSubmit={handleVerify}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enter the last 4 digits of your phone number
            </label>
            <input
              type="text"
              maxLength={4}
              pattern="[0-9]{4}"
              value={lastFour}
              onChange={(e) => setLastFour(e.target.value)}
              className="input mb-4"
              placeholder="1234"
              required
            />
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <button
              type="submit"
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Verify
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-bold mb-4">Confirm Check-In</h1>
        <div className="space-y-2 mb-6 text-sm">
          <p>
            <span className="text-gray-500">Name:</span>{" "}
            {appointment?.patient_name}
          </p>
          <p>
            <span className="text-gray-500">Appointment:</span> {formattedTime}{" "}
            - {appointment?.type}
          </p>
          <p>
            <span className="text-gray-500">Clinic:</span>{" "}
            {appointment?.clinic_name}
          </p>
        </div>
        <button
          onClick={handleCheckIn}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Confirm Check-In
        </button>
      </div>
    </div>
  );
}
