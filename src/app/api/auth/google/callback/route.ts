import { NextRequest } from "next/server";
import { handleCallback } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const clinicId = searchParams.get("state");

  if (!code || !clinicId) {
    return Response.json({ error: "Missing code or clinic ID" }, { status: 400 });
  }

  await handleCallback(code, clinicId);

  return Response.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?google=connected`
  );
}
