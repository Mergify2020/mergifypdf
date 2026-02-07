// (paste together) — CREATE NEW FILE
import { NextResponse } from "next/server";
import { sendResetEmail } from "@/lib/email";

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const to = searchParams.get("to");
    if (!to) {
      return NextResponse.json({ ok: false, error: "Missing ?to=" }, { status: 400 });
    }
    // Use a fake code just to test deliverability
    const code = "123456";

    const result = await sendResetEmail({ to, code });

    return NextResponse.json({
      ok: result.ok,
      id: result.ok ? result.id ?? null : null,
      fallback: result.ok ? Boolean(result.fallback) : undefined,
      error: result.ok ? null : result.error,
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
