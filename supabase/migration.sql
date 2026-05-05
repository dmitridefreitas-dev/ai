-- AI Voice Receptionist — Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CLINICS (multi-tenant root)
-- ============================================
CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT,
  retell_agent_id TEXT,
  twilio_number TEXT NOT NULL UNIQUE,
  google_calendar_id TEXT,
  google_oauth_tokens JSONB,
  timezone TEXT NOT NULL DEFAULT 'America/Barbados',
  business_hours JSONB NOT NULL DEFAULT '{
    "monday": {"open": "08:00", "close": "17:00"},
    "tuesday": {"open": "08:00", "close": "17:00"},
    "wednesday": {"open": "08:00", "close": "17:00"},
    "thursday": {"open": "08:00", "close": "17:00"},
    "friday": {"open": "08:00", "close": "17:00"},
    "saturday": null,
    "sunday": null
  }'::jsonb,
  settings JSONB NOT NULL DEFAULT '{
    "reminder_hours_before": 24,
    "noshow_window_minutes": 30,
    "appointment_types": [
      {"name": "consultation", "duration_minutes": 30},
      {"name": "follow-up", "duration_minutes": 15},
      {"name": "new-patient", "duration_minutes": 45}
    ],
    "transfer_numbers": {},
    "intake_form_fields": [
      "full_name", "date_of_birth", "phone", "email", "address",
      "insurance_provider", "insurance_number", "medical_history",
      "allergies", "current_medications", "reason_for_visit",
      "emergency_contact_name", "emergency_contact_phone"
    ]
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- STAFF (clinic employees who use the dashboard)
-- ============================================
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'receptionist' CHECK (role IN ('admin', 'receptionist')),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clinic_id, email)
);

-- ============================================
-- PATIENTS
-- ============================================
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL,
  email TEXT,
  date_of_birth DATE,
  insurance_info JSONB,
  intake_status TEXT NOT NULL DEFAULT 'pending' CHECK (intake_status IN ('pending', 'sent', 'completed')),
  intake_token UUID UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clinic_id, phone)
);

-- ============================================
-- APPOINTMENTS
-- ============================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  datetime_start TIMESTAMPTZ NOT NULL,
  datetime_end TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  type TEXT NOT NULL DEFAULT 'consultation',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'checked_in', 'completed', 'no_show', 'cancelled')),
  google_event_id TEXT,
  reminder_sent_at TIMESTAMPTZ,
  confirmation_reply TEXT,
  checkin_token UUID UNIQUE,
  checkin_completed_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('ai_phone', 'ai_sms', 'manual', 'online')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CALL LOGS
-- ============================================
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  retell_call_id TEXT NOT NULL UNIQUE,
  caller_phone TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  recording_url TEXT,
  transcript TEXT,
  actions_taken JSONB NOT NULL DEFAULT '[]'::jsonb,
  outcome TEXT NOT NULL DEFAULT 'info_only' CHECK (outcome IN ('booked', 'transferred', 'info_only', 'voicemail', 'missed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SMS MESSAGES
-- ============================================
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  to_phone TEXT NOT NULL,
  from_phone TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('reminder', 'confirmation', 'noshow_outreach', 'checkin', 'manual', 'intake')),
  twilio_sid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- EMAIL MESSAGES
-- ============================================
CREATE TABLE email_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  type TEXT NOT NULL,
  template_used TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INTAKE SUBMISSIONS
-- ============================================
CREATE TABLE intake_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_staff_clinic ON staff(clinic_id);
CREATE INDEX idx_staff_auth_user ON staff(auth_user_id);
CREATE INDEX idx_patients_clinic ON patients(clinic_id);
CREATE INDEX idx_patients_phone ON patients(clinic_id, phone);
CREATE INDEX idx_appointments_clinic ON appointments(clinic_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_datetime ON appointments(datetime_start);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_checkin_token ON appointments(checkin_token);
CREATE INDEX idx_call_logs_clinic ON call_logs(clinic_id);
CREATE INDEX idx_call_logs_retell ON call_logs(retell_call_id);
CREATE INDEX idx_sms_messages_clinic ON sms_messages(clinic_id);
CREATE INDEX idx_email_messages_clinic ON email_messages(clinic_id);
CREATE INDEX idx_intake_submissions_patient ON intake_submissions(patient_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_submissions ENABLE ROW LEVEL SECURITY;

-- Staff can read their own clinic's data
CREATE POLICY "Staff can view own clinic" ON clinics
  FOR SELECT USING (
    id IN (SELECT clinic_id FROM staff WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Staff can view own clinic staff" ON staff
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Staff can view own clinic patients" ON patients
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Staff can manage own clinic patients" ON patients
  FOR ALL USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Staff can view own clinic appointments" ON appointments
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Staff can manage own clinic appointments" ON appointments
  FOR ALL USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Staff can view own clinic call logs" ON call_logs
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Staff can view own clinic SMS" ON sms_messages
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Staff can view own clinic emails" ON email_messages
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Staff can view own clinic intake submissions" ON intake_submissions
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM staff WHERE auth_user_id = auth.uid())
  );

-- Public access for intake forms (patients use token, no auth)
CREATE POLICY "Public can view patient by intake token" ON patients
  FOR SELECT USING (intake_token IS NOT NULL);

CREATE POLICY "Public can update patient intake" ON patients
  FOR UPDATE USING (intake_token IS NOT NULL);

CREATE POLICY "Public can submit intake" ON intake_submissions
  FOR INSERT WITH CHECK (true);

-- Public access for check-in (patients use token, no auth)
CREATE POLICY "Public can view appointment by checkin token" ON appointments
  FOR SELECT USING (checkin_token IS NOT NULL);

CREATE POLICY "Public can update appointment checkin" ON appointments
  FOR UPDATE USING (checkin_token IS NOT NULL);

-- Public can read clinic name/phone for intake and checkin pages
CREATE POLICY "Public can view clinic basics" ON clinics
  FOR SELECT USING (true);

-- Service role bypasses RLS (used by API routes, cron jobs, webhooks)
-- Supabase service_role key automatically bypasses RLS
