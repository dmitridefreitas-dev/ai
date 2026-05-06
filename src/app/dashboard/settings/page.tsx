"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ClinicSettings = {
  reminder_hours_before: number;
  noshow_window_minutes: number;
  appointment_types: { name: string; duration_minutes: number }[];
  transfer_numbers: Record<string, string>;
  intake_form_fields: string[];
};

type BusinessHours = {
  [day: string]: { open: string; close: string } | null;
};

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function SettingsPage() {
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [businessHours, setBusinessHours] = useState<BusinessHours>({});
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);

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
      setClinicId(staffRow.clinic_id);

      const { data: clinic } = await supabase
        .from("clinics")
        .select("business_hours, settings, google_oauth_tokens")
        .eq("id", staffRow.clinic_id)
        .single();

      if (clinic) {
        setBusinessHours(clinic.business_hours as unknown as BusinessHours);
        setSettings(clinic.settings as unknown as ClinicSettings);
        setGoogleConnected(!!clinic.google_oauth_tokens);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!clinicId || !settings) return;
    setSaving(true);
    setSaved(false);

    const supabase = createClient();
    await supabase
      .from("clinics")
      .update({
        business_hours: JSON.parse(JSON.stringify(businessHours)),
        settings: JSON.parse(JSON.stringify(settings)),
      })
      .eq("id", clinicId);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function toggleDay(day: string) {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: prev[day] ? null : { open: "08:00", close: "17:00" },
    }));
  }

  function updateHours(day: string, field: "open" | "close", value: string) {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: { ...(prev[day] as { open: string; close: string }), [field]: value },
    }));
  }

  function addAppointmentType() {
    if (!settings) return;
    setSettings({
      ...settings,
      appointment_types: [
        ...settings.appointment_types,
        { name: "", duration_minutes: 30 },
      ],
    });
  }

  function removeAppointmentType(index: number) {
    if (!settings) return;
    setSettings({
      ...settings,
      appointment_types: settings.appointment_types.filter((_, i) => i !== index),
    });
  }

  function updateAppointmentType(index: number, field: "name" | "duration_minutes", value: string | number) {
    if (!settings) return;
    const types = [...settings.appointment_types];
    types[index] = { ...types[index], [field]: value };
    setSettings({ ...settings, appointment_types: types });
  }

  if (loading || !settings) {
    return <div className="p-8 text-center text-gray-400">Loading settings...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="flex items-center gap-3">
          {saved && <span className="text-green-600 text-sm">Saved!</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Business Hours */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="font-semibold text-lg mb-4">Business Hours</h2>
          <div className="space-y-3">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-4">
                <label className="flex items-center gap-2 w-32">
                  <input
                    type="checkbox"
                    checked={!!businessHours[day]}
                    onChange={() => toggleDay(day)}
                    className="rounded"
                  />
                  <span className="text-sm capitalize">{day}</span>
                </label>
                {businessHours[day] ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={businessHours[day]!.open}
                      onChange={(e) => updateHours(day, "open", e.target.value)}
                      className="input w-32"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="time"
                      value={businessHours[day]!.close}
                      onChange={(e) => updateHours(day, "close", e.target.value)}
                      className="input w-32"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Closed</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Appointment Types */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Appointment Types</h2>
            <button
              onClick={addAppointmentType}
              className="text-sm text-sky-500 hover:text-sky-600"
            >
              + Add Type
            </button>
          </div>
          <div className="space-y-3">
            {settings.appointment_types.map((type, i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="text"
                  value={type.name}
                  onChange={(e) => updateAppointmentType(i, "name", e.target.value)}
                  placeholder="Appointment type name"
                  className="input flex-1"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={type.duration_minutes}
                    onChange={(e) => updateAppointmentType(i, "duration_minutes", parseInt(e.target.value) || 0)}
                    className="input w-20 text-center"
                  />
                  <span className="text-sm text-gray-500">min</span>
                </div>
                <button
                  onClick={() => removeAppointmentType(i)}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Automation Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="font-semibold text-lg mb-4">Automation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reminder (hours before appointment)
              </label>
              <input
                type="number"
                value={settings.reminder_hours_before}
                onChange={(e) =>
                  setSettings({ ...settings, reminder_hours_before: parseInt(e.target.value) || 24 })
                }
                className="input w-24"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                No-show window (minutes after appointment)
              </label>
              <input
                type="number"
                value={settings.noshow_window_minutes}
                onChange={(e) =>
                  setSettings({ ...settings, noshow_window_minutes: parseInt(e.target.value) || 30 })
                }
                className="input w-24"
              />
            </div>
          </div>
        </div>

        {/* Transfer Numbers */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="font-semibold text-lg mb-4">Transfer Numbers</h2>
          <div className="space-y-3">
            {Object.entries(settings.transfer_numbers).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 w-24 capitalize">{key}:</span>
                <input
                  type="tel"
                  value={value}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      transfer_numbers: { ...settings.transfer_numbers, [key]: e.target.value },
                    })
                  }
                  className="input w-48"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Google Calendar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="font-semibold text-lg mb-4">Google Calendar</h2>
          {googleConnected ? (
            <p className="text-sm text-green-600">Connected</p>
          ) : (
            <a
              href={`/api/auth/google/connect?clinic_id=${clinicId}`}
              className="inline-block bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Connect Google Calendar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
