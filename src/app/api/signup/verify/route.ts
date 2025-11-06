import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySignupCode, issueSignupVerificationCode } from "@/lib/signupVerification";

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    if (!email || !code || typeof email !== "string" || typeof code !== "string") {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Invalid code format" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const check = await verifySignupCode(user.id, code);
    if (!check.ok) {
      return NextResponse.json({ error: check.reason }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[signup.verify] error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    await issueSignupVerificationCode(user.id, email);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[signup.verify.resend] error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
