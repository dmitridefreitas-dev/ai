import { google } from "googleapis";
import { createServiceClient } from "@/lib/supabase/server";
import { Clinic, BusinessHours } from "@/lib/types/database";

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
}

export function getAuthUrl(clinicId: string) {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar"],
    state: clinicId,
  });
}

export async function handleCallback(code: string, clinicId: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  const supabase = createServiceClient();
  await supabase
    .from("clinics")
    .update({ google_oauth_tokens: JSON.parse(JSON.stringify(tokens)) })
    .eq("id", clinicId);

  return tokens;
}

async function getAuthedCalendar(clinic: Clinic) {
  const oauth2Client = getOAuth2Client();
  const tokens = clinic.google_oauth_tokens;

  if (!tokens) {
    throw new Error(`Clinic ${clinic.id} has no Google Calendar connected`);
  }

  const tokenObj = tokens as Record<string, unknown>;
  oauth2Client.setCredentials(tokenObj as {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
  });

  oauth2Client.on("tokens", async (newTokens) => {
    const supabase = createServiceClient();
    const merged = { ...tokenObj, ...newTokens };
    await supabase
      .from("clinics")
      .update({ google_oauth_tokens: JSON.parse(JSON.stringify(merged)) })
      .eq("id", clinic.id);
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function getAvailableSlots(
  clinic: Clinic,
  date: string,
  durationMinutes: number
) {
  const calendar = await getAuthedCalendar(clinic);
  const calendarId = clinic.google_calendar_id || "primary";

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  const busyResponse = await calendar.freebusy.query({
    requestBody: {
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      timeZone: clinic.timezone,
      items: [{ id: calendarId }],
    },
  });

  const busySlots =
    busyResponse.data.calendars?.[calendarId]?.busy || [];

  const hours = clinic.business_hours as unknown as BusinessHours;
  const dayName = dayStart
    .toLocaleDateString("en-US", { weekday: "long", timeZone: clinic.timezone })
    .toLowerCase();
  const dayHours = hours[dayName];

  if (!dayHours) return [];

  const slots: { start: string; end: string }[] = [];
  const openTime = new Date(`${date}T${dayHours.open}:00`);
  const closeTime = new Date(`${date}T${dayHours.close}:00`);

  let current = new Date(openTime);

  while (current.getTime() + durationMinutes * 60000 <= closeTime.getTime()) {
    const slotEnd = new Date(current.getTime() + durationMinutes * 60000);

    const isBusy = busySlots.some((busy) => {
      const busyStart = new Date(busy.start!);
      const busyEnd = new Date(busy.end!);
      return current < busyEnd && slotEnd > busyStart;
    });

    if (!isBusy) {
      slots.push({
        start: current.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: clinic.timezone,
        }),
        end: slotEnd.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: clinic.timezone,
        }),
      });
    }

    current = new Date(current.getTime() + 30 * 60000);
  }

  return slots;
}

export async function createEvent(
  clinic: Clinic,
  {
    summary,
    startTime,
    endTime,
    description,
    attendeeEmail,
  }: {
    summary: string;
    startTime: string;
    endTime: string;
    description?: string;
    attendeeEmail?: string;
  }
) {
  const calendar = await getAuthedCalendar(clinic);
  const calendarId = clinic.google_calendar_id || "primary";

  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary,
      description,
      start: { dateTime: startTime, timeZone: clinic.timezone },
      end: { dateTime: endTime, timeZone: clinic.timezone },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : undefined,
    },
  });

  return event.data;
}

export async function deleteEvent(clinic: Clinic, eventId: string) {
  const calendar = await getAuthedCalendar(clinic);
  const calendarId = clinic.google_calendar_id || "primary";

  await calendar.events.delete({
    calendarId,
    eventId,
  });
}
