import { v4 as uuidv4 } from "uuid";
import { getClinicFromCall, RetellFunctionRequest, retellResponse } from "@/lib/retell";
import { createEvent } from "@/lib/google-calendar";
import { createServiceClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/twilio";
import { sendEmail } from "@/lib/resend";
import { ClinicSettings } from "@/lib/types/database";

export async function POST(request: Request) {
  try {
  const body: RetellFunctionRequest = await request.json();
  const { call: callObj, args } = body;

  const clinic = await getClinicFromCall(callObj);
  if (!clinic) {
    return retellResponse({ error: "Clinic not found" });
  }

  const patientName = args.patient_name as string;
  const patientPhone = args.patient_phone as string;
  const date = args.date as string;
  const time = args.time as string;
  const appointmentType = args.appointment_type as string || "consultation";
  const patientEmail = args.patient_email as string | undefined;

  const settings = clinic.settings as unknown as ClinicSettings;
  const typeConfig = settings.appointment_types.find(
    (t) => t.name.toLowerCase() === appointmentType.toLowerCase()
  );
  const duration = typeConfig?.duration_minutes ?? 30;

  const startTime = new Date(`${date}T${convertTo24h(time)}`);
  const endTime = new Date(startTime.getTime() + duration * 60000);

  const supabase = createServiceClient();

  const [firstName, ...lastParts] = patientName.split(" ");
  const lastName = lastParts.join(" ") || "";

  const { data: existingPatient } = await supabase
    .from("patients")
    .select("*")
    .eq("clinic_id", clinic.id)
    .eq("phone", patientPhone)
    .single();

  let patientId: string;
  let isNewPatient = false;

  if (existingPatient) {
    patientId = existingPatient.id;
  } else {
    isNewPatient = true;
    const intakeToken = uuidv4();
    const { data: newPatient, error } = await supabase
      .from("patients")
      .insert({
        clinic_id: clinic.id,
        first_name: firstName,
        last_name: lastName,
        phone: patientPhone,
        email: patientEmail ?? null,
        intake_status: "pending",
        intake_token: intakeToken,
      })
      .select()
      .single();

    if (error || !newPatient) {
      return retellResponse({ error: "Failed to create patient record" });
    }
    patientId = newPatient.id;
  }

  let googleEventId: string | null = null;
  if (clinic.google_oauth_tokens) {
    const event = await createEvent(clinic, {
      summary: `${patientName} - ${appointmentType}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      description: `Patient: ${patientName}\nPhone: ${patientPhone}\nType: ${appointmentType}`,
      attendeeEmail: patientEmail,
    });
    googleEventId = event.id ?? null;
  }

  const { error: apptError } = await supabase.from("appointments").insert({
    clinic_id: clinic.id,
    patient_id: patientId,
    datetime_start: startTime.toISOString(),
    datetime_end: endTime.toISOString(),
    duration_minutes: duration,
    type: appointmentType,
    status: "scheduled",
    google_event_id: googleEventId,
    source: "ai_phone",
  });

  if (apptError) {
    return retellResponse({ error: "Failed to create appointment" });
  }

  const formattedDate = startTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: clinic.timezone,
  });
  const formattedTime = startTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: clinic.timezone,
  });

  await sendSms({
    to: patientPhone,
    from: clinic.twilio_number,
    body: `Your appointment at ${clinic.name} is confirmed for ${formattedDate} at ${formattedTime}. Reply C to confirm or R to reschedule.`,
    clinicId: clinic.id,
    patientId,
    type: "confirmation",
  });

  if (isNewPatient) {
    const { data: patient } = await supabase
      .from("patients")
      .select("intake_token")
      .eq("id", patientId)
      .single();

    if (patient?.intake_token) {
      const intakeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/intake/${patient.intake_token}`;

      await sendSms({
        to: patientPhone,
        from: clinic.twilio_number,
        body: `Welcome to ${clinic.name}! Please complete your intake form before your visit: ${intakeUrl}`,
        clinicId: clinic.id,
        patientId,
        type: "intake",
      });

      if (patientEmail) {
        await sendEmail({
          to: patientEmail,
          subject: `Welcome to ${clinic.name} - Please Complete Your Intake Form`,
          html: `
            <h2>Welcome to ${clinic.name}!</h2>
            <p>Your appointment is confirmed for <strong>${formattedDate} at ${formattedTime}</strong>.</p>
            <p>Please complete your intake form before your visit:</p>
            <p><a href="${intakeUrl}" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Complete Intake Form</a></p>
            <p>If you have any questions, please contact us at ${clinic.phone}.</p>
          `,
          clinicId: clinic.id,
          patientId,
          type: "intake",
          templateUsed: "new_patient_intake",
        });
      }
    }
  }

  return retellResponse({
    success: true,
    message: `Appointment booked for ${formattedDate} at ${formattedTime}. A confirmation has been sent to the patient.`,
  });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return retellResponse({ error: "book-appointment crashed", message });
  }
}

function convertTo24h(time12h: string): string {
  const [time, modifier] = time12h.split(/(am|pm)/i);
  let [hours, minutes] = time.trim().replace(":", " ").split(/[\s:]+/);
  let h = parseInt(hours, 10);

  if (!minutes) minutes = "00";
  if (modifier?.toLowerCase() === "pm" && h !== 12) h += 12;
  if (modifier?.toLowerCase() === "am" && h === 12) h = 0;

  return `${h.toString().padStart(2, "0")}:${minutes}:00`;
}
