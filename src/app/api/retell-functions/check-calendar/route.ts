import { retellResponse } from "@/lib/retell";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    return retellResponse({
      debug: true,
      body_keys: Object.keys(body),
      body_snapshot: JSON.stringify(body).slice(0, 500),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return retellResponse({ error: "crash", message });
  }
}
