import { NextResponse } from "next/server";
import { sendResetEmail } from "@/lib/email";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const to = "morrisalan2020@gmail.com";
  const code = "123456";
  const result = await sendResetEmail({ to, code });
  return NextResponse.json({ ok: true, result });
}
