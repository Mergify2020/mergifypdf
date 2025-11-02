// src/app/api/dev/send-reset/route.ts — PASTE OVER EVERYTHING
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = (searchParams.get("mode") as "react" | "html") || "react";

  const emailLib = await import("@/lib/email");
  const sendResetEmail = (emailLib as any).sendResetEmail;

  if (typeof sendResetEmail !== "function") {
    return NextResponse.json({
      ok: false,
      error: "sendResetEmail not a function",
      keys: Object.keys(emailLib),
    });
    }
  const to = "morrisalan2020@gmail.com";
  const token = "debug-" + Date.now();

  try {
    const result = await sendResetEmail({ to, token, mode });
    return NextResponse.json({ ok: true, mode, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, mode, error: String(e?.stack || e) });
  }
}
