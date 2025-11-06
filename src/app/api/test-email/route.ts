// (paste together) — CREATE NEW FILE
import { NextResponse } from "next/server";
import { sendResetEmail } from "@/lib/email";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const to = searchParams.get("to");
    if (!to) {
      return NextResponse.json({ ok: false, error: "Missing ?to=" }, { status: 400 });
    }
    // Use a fake token just to test deliverability/link
    const token = "test-token-" + Math.random().toString(36).slice(2);

    const result = await sendResetEmail({ to, token });

    return NextResponse.json({
      ok: result.ok,
      id: (result as any).id ?? null,
      error: (result as any).error ?? null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Unexpected error" }, { status: 500 });
  }
}
