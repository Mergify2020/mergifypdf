import { NextResponse } from "next/server";

export async function GET() {
  // dynamic import to avoid any ESM interop weirdness
  const emailLib = await import("@/lib/email");
  const keys = Object.keys(emailLib);
  const fn = (emailLib as any).sendResetEmail;

  if (typeof fn !== "function") {
    return NextResponse.json({
      ok: false,
      error: "sendResetEmail not a function",
      keys,
      typeofSendResetEmail: typeof fn,
    });
  }

  try {
    const to = "morrisalan2020@gmail.com";
    const token = "debug-" + Date.now();
    const result = await fn({ to, token });
    return NextResponse.json({ ok: true, result, keys });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: String(e?.stack || e),
      keys,
    });
  }
}
