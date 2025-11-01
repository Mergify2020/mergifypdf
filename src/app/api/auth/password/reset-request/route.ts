import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { sendResetEmail } from "@/lib/mail";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ ok: true }); // don't leak

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.email) return NextResponse.json({ ok: true });

    // create random token row, 30-min expiry
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 30 * 60 * 1000);
    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    // NEW: approval link hits a server endpoint that sets a secure cookie
    const verifyUrl = `${base}/api/auth/password/reset-verify?token=${token}&email=${encodeURIComponent(email)}`;

    const devMode = process.env.NODE_ENV !== "production" || !process.env.SMTP_HOST;
    if (devMode) {
      console.log("DEV approve URL:", verifyUrl);
      return NextResponse.json({ ok: true, devResetUrl: verifyUrl });
    }

    await sendResetEmail(email, verifyUrl);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: true });
  }
}
