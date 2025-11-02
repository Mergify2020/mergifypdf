import { NextResponse } from "next/server";
import { sendResetEmail } from "@/lib/email"; // <- named import

export async function GET() {
  const to = "morrisalan2020@gmail.com";
  const token = "debug-" + Date.now();

  const result = await sendResetEmail({ to, token });
  return NextResponse.json(result);
}
