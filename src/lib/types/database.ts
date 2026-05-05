export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      clinics: {
        Row: {
          id: string; name: string; phone: string; email: string; address: string | null;
          retell_agent_id: string | null; twilio_number: string; google_calendar_id: string | null;
          google_oauth_tokens: Json | null; timezone: string; business_hours: Json; settings: Json; created_at: string;
        };
        Insert: {
          id?: string; name: string; phone: string; email: string; address?: string | null;
          retell_agent_id?: string | null; twilio_number: string; google_calendar_id?: string | null;
          google_oauth_tokens?: Json | null; timezone?: string; business_hours?: Json; settings?: Json; created_at?: string;
        };
        Update: {
          id?: string; name?: string; phone?: string; email?: string; address?: string | null;
          retell_agent_id?: string | null; twilio_number?: string; google_calendar_id?: string | null;
          google_oauth_tokens?: Json | null; timezone?: string; business_hours?: Json; settings?: Json; created_at?: string;
        };
        Relationships: [];
      };
      staff: {
        Row: {
          id: string; clinic_id: string; email: string; name: string; role: string; auth_user_id: string; created_at: string;
        };
        Insert: {
          id?: string; clinic_id: string; email: string; name: string; role?: string; auth_user_id: string; created_at?: string;
        };
        Update: {
          id?: string; clinic_id?: string; email?: string; name?: string; role?: string; auth_user_id?: string; created_at?: string;
        };
        Relationships: [];
      };
      patients: {
        Row: {
          id: string; clinic_id: string; first_name: string; last_name: string; phone: string; email: string | null;
          date_of_birth: string | null; insurance_info: Json | null; intake_status: string; intake_token: string | null;
          notes: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; clinic_id: string; first_name: string; last_name?: string; phone: string; email?: string | null;
          date_of_birth?: string | null; insurance_info?: Json | null; intake_status?: string; intake_token?: string | null;
          notes?: string | null; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; clinic_id?: string; first_name?: string; last_name?: string; phone?: string; email?: string | null;
          date_of_birth?: string | null; insurance_info?: Json | null; intake_status?: string; intake_token?: string | null;
          notes?: string | null; created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string; clinic_id: string; patient_id: string; datetime_start: string; datetime_end: string;
          duration_minutes: number; type: string; status: string; google_event_id: string | null;
          reminder_sent_at: string | null; confirmation_reply: string | null; checkin_token: string | null;
          checkin_completed_at: string | null; source: string; notes: string | null; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; clinic_id: string; patient_id: string; datetime_start: string; datetime_end: string;
          duration_minutes?: number; type?: string; status?: string; google_event_id?: string | null;
          reminder_sent_at?: string | null; confirmation_reply?: string | null; checkin_token?: string | null;
          checkin_completed_at?: string | null; source?: string; notes?: string | null; created_at?: string; updated_at?: string;
        };
        Update: {
          id?: string; clinic_id?: string; patient_id?: string; datetime_start?: string; datetime_end?: string;
          duration_minutes?: number; type?: string; status?: string; google_event_id?: string | null;
          reminder_sent_at?: string | null; confirmation_reply?: string | null; checkin_token?: string | null;
          checkin_completed_at?: string | null; source?: string; notes?: string | null; created_at?: string; updated_at?: string;
        };
        Relationships: [];
      };
      call_logs: {
        Row: {
          id: string; clinic_id: string; patient_id: string | null; retell_call_id: string; caller_phone: string;
          direction: string; duration_seconds: number; recording_url: string | null; transcript: string | null;
          actions_taken: Json; outcome: string; created_at: string;
        };
        Insert: {
          id?: string; clinic_id: string; patient_id?: string | null; retell_call_id: string; caller_phone: string;
          direction?: string; duration_seconds?: number; recording_url?: string | null; transcript?: string | null;
          actions_taken?: Json; outcome?: string; created_at?: string;
        };
        Update: {
          id?: string; clinic_id?: string; patient_id?: string | null; retell_call_id?: string; caller_phone?: string;
          direction?: string; duration_seconds?: number; recording_url?: string | null; transcript?: string | null;
          actions_taken?: Json; outcome?: string; created_at?: string;
        };
        Relationships: [];
      };
      sms_messages: {
        Row: {
          id: string; clinic_id: string; patient_id: string | null; direction: string; to_phone: string;
          from_phone: string; body: string; type: string; twilio_sid: string | null; created_at: string;
        };
        Insert: {
          id?: string; clinic_id: string; patient_id?: string | null; direction: string; to_phone: string;
          from_phone: string; body: string; type: string; twilio_sid?: string | null; created_at?: string;
        };
        Update: {
          id?: string; clinic_id?: string; patient_id?: string | null; direction?: string; to_phone?: string;
          from_phone?: string; body?: string; type?: string; twilio_sid?: string | null; created_at?: string;
        };
        Relationships: [];
      };
      email_messages: {
        Row: {
          id: string; clinic_id: string; patient_id: string | null; to_email: string; subject: string;
          type: string; template_used: string; sent_at: string;
        };
        Insert: {
          id?: string; clinic_id: string; patient_id?: string | null; to_email: string; subject: string;
          type: string; template_used: string; sent_at?: string;
        };
        Update: {
          id?: string; clinic_id?: string; patient_id?: string | null; to_email?: string; subject?: string;
          type?: string; template_used?: string; sent_at?: string;
        };
        Relationships: [];
      };
      intake_submissions: {
        Row: {
          id: string; patient_id: string; clinic_id: string; form_data: Json; submitted_at: string;
        };
        Insert: {
          id?: string; patient_id: string; clinic_id: string; form_data?: Json; submitted_at?: string;
        };
        Update: {
          id?: string; patient_id?: string; clinic_id?: string; form_data?: Json; submitted_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Clinic = Database["public"]["Tables"]["clinics"]["Row"];
export type Staff = Database["public"]["Tables"]["staff"]["Row"];
export type Patient = Database["public"]["Tables"]["patients"]["Row"];
export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type CallLog = Database["public"]["Tables"]["call_logs"]["Row"];
export type SmsMessage = Database["public"]["Tables"]["sms_messages"]["Row"];
export type EmailMessage = Database["public"]["Tables"]["email_messages"]["Row"];
export type IntakeSubmission = Database["public"]["Tables"]["intake_submissions"]["Row"];

export type BusinessHours = {
  [day: string]: { open: string; close: string } | null;
};

export type ClinicSettings = {
  reminder_hours_before: number;
  noshow_window_minutes: number;
  appointment_types: AppointmentType[];
  transfer_numbers: Record<string, string>;
  intake_form_fields: string[];
};

export type AppointmentType = {
  name: string;
  duration_minutes: number;
};
