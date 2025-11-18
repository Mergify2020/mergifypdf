import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { issueSignupVerificationCode } from "@/lib/signupVerification";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    let userId: string;
    if (existing) {
      const linkedOauthCount = await prisma.account.count({
        where: { userId: existing.id },
      });
      if (linkedOauthCount > 0) {
        return NextResponse.json(
          { error: "This email is linked to Google. Please continue with Google sign-in." },
          { status: 409 }
        );
      }

      if (existing.password && existing.emailVerified) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }

      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: name ?? existing.name ?? null,
          password: hashed,
          emailVerified: null,
        },
        select: { id: true },
      });
      userId = updated.id;
    } else {
      const created = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name ?? null,
          password: hashed,
        },
        select: { id: true },
      });
      userId = created.id;
    }

    await issueSignupVerificationCode(userId, email);

    return NextResponse.json({ ok: true, requiresVerification: true }, { status: 201 });
  } catch (e) {
    console.error("signup error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
