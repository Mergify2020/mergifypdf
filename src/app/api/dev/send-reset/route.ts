import { NextResponse } from "next/server";
import { sendResetEmail } from "@/lib/email";

export async function GET() {
  // change this address if you want to try another inbox
  const to = "morrisalan2020@gmail.com";
  const token = "debug-" + Date.now();

  const result = await sendResetEmail({ to, token });
  return NextResponse.json(result);
}
