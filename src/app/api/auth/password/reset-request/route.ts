import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // Always reply 200 to avoid user enumeration
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = await generateToken(user.id); // user.id is string (cuid)
      await sendResetEmail({ to: email, token }); // object form from email.ts
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Unexpected error" }, { status: 500 });
  }
}
