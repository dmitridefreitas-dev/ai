"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type ClinicInfo = { name: string; phone: string };

type PatientInfo = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  clinic_id: string;
};

export default function IntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    date_of_birth: "",
    phone: "",
    email: "",
    address: "",
    insurance_provider: "",
    insurance_number: "",
    medical_history: "",
    allergies: "",
    current_medications: "",
    reason_for_visit: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });

  useEffect(() => {
    params.then(({ token }) => loadPatient(token));
  }, [params]);

  async function loadPatient(token: string) {
    const supabase = createClient();

    const { data: p } = await supabase
      .from("patients")
      .select("id, first_name, last_name, phone, email, clinic_id")
      .eq("intake_token", token)
      .single();

    if (!p) {
      setError("Invalid or expired intake link.");
      setLoading(false);
      return;
    }

    const { data: c } = await supabase
      .from("clinics")
      .select("name, phone")
      .eq("id", p.clinic_id)
      .single();

    setPatient(p);
    setClinic(c);
    setFormData((prev) => ({
      ...prev,
      full_name: `${p.first_name} ${p.last_name}`,
      phone: p.phone,
      email: p.email || "",
    }));
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patient) return;

    const supabase = createClient();

    const { error: submitError } = await supabase
      .from("intake_submissions")
      .insert({
        patient_id: patient.id,
        clinic_id: patient.clinic_id,
        form_data: JSON.parse(JSON.stringify(formData)),
        submitted_at: new Date().toISOString(),
      });

    if (submitError) {
      setError("Failed to submit form. Please try again.");
      return;
    }

    await supabase
      .from("patients")
      .update({
        intake_status: "completed",
        email: formData.email || patient.email,
        date_of_birth: formData.date_of_birth || null,
        insurance_info: JSON.parse(
          JSON.stringify({
            provider: formData.insurance_provider,
            number: formData.insurance_number,
          })
        ),
        updated_at: new Date().toISOString(),
      })
      .eq("id", patient.id);

    setSubmitted(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md text-center p-8">
          <div className="text-green-500 text-5xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold mb-2">Intake Form Submitted</h1>
          <p className="text-gray-600">
            Thank you! Your information has been received by {clinic?.name}. See
            you at your appointment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold mb-1">
            {clinic?.name} - Patient Intake Form
          </h1>
          <p className="text-gray-500 text-sm">
            Please complete this form before your visit.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Section title="Personal Information">
            <Field label="Full Name" required>
              <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="input" required />
            </Field>
            <Field label="Date of Birth" required>
              <input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} className="input" required />
            </Field>
            <Field label="Phone">
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input" />
            </Field>
            <Field label="Email">
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input" />
            </Field>
            <Field label="Address">
              <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input" rows={2} />
            </Field>
          </Section>

          <Section title="Insurance Information">
            <Field label="Insurance Provider">
              <input type="text" value={formData.insurance_provider} onChange={(e) => setFormData({ ...formData, insurance_provider: e.target.value })} className="input" />
            </Field>
            <Field label="Insurance/Policy Number">
              <input type="text" value={formData.insurance_number} onChange={(e) => setFormData({ ...formData, insurance_number: e.target.value })} className="input" />
            </Field>
          </Section>

          <Section title="Medical History">
            <Field label="Medical History">
              <textarea value={formData.medical_history} onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })} className="input" rows={3} placeholder="List any past surgeries, chronic conditions, etc." />
            </Field>
            <Field label="Allergies">
              <textarea value={formData.allergies} onChange={(e) => setFormData({ ...formData, allergies: e.target.value })} className="input" rows={2} placeholder="List any known allergies" />
            </Field>
            <Field label="Current Medications">
              <textarea value={formData.current_medications} onChange={(e) => setFormData({ ...formData, current_medications: e.target.value })} className="input" rows={2} placeholder="List any medications you're currently taking" />
            </Field>
            <Field label="Reason for Visit" required>
              <textarea value={formData.reason_for_visit} onChange={(e) => setFormData({ ...formData, reason_for_visit: e.target.value })} className="input" rows={2} required />
            </Field>
          </Section>

          <Section title="Emergency Contact">
            <Field label="Contact Name">
              <input type="text" value={formData.emergency_contact_name} onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })} className="input" />
            </Field>
            <Field label="Contact Phone">
              <input type="tel" value={formData.emergency_contact_phone} onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })} className="input" />
            </Field>
          </Section>

          <button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-3 px-4 rounded-lg transition-colors">
            Submit Intake Form
          </button>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4 pb-2 border-b">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
