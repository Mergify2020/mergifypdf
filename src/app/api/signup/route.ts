import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { issueSignupVerificationCode } from "@/lib/signupVerification";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const existing = await prisma.user.findUnique({ where: { email } });
    let userId: string;
    if (existing) {
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
          email,
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
