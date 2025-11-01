import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // Always behave the same whether the user exists (don’t leak)
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      // create token row
      const token = await generateToken(user.id); // returns the raw token string
      // send email with new helper (object arg)
      await sendResetEmail({ to: email, token });
    }

    // Generic success
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Unexpected error" }, { status: 500 });
  }
}
