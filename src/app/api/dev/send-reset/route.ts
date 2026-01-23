import { NextResponse } from "next/server";
import { sendResetEmail } from "@/lib/email";

export async function GET() {
  const to = "morrisalan2020@gmail.com";
  const code = "123456";
  const result = await sendResetEmail({ to, code });
  return NextResponse.json({ ok: true, result });
}
