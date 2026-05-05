import { NextRequest } from "next/server";
import { getAuthUrl } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const clinicId = request.nextUrl.searchParams.get("clinic_id");

  if (!clinicId) {
    return Response.json({ error: "Missing clinic_id parameter" }, { status: 400 });
  }

  const authUrl = getAuthUrl(clinicId);
  return Response.redirect(authUrl);
}
