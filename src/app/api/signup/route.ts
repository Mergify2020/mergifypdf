import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { issueSignupVerificationCode } from "@/lib/signupVerification";
import { isSameOrigin } from "@/lib/requestGuards";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
    const limit = await rateLimit(req, { keyPrefix: "signup", windowMs: 60_000, max: 5 });
    if (!limit.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
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

      const deletionRecord = await prisma.accountDeletionRecord.findFirst({
        where: { email: normalizedEmail },
        select: { id: true },
        orderBy: { deletedAt: "desc" },
      });

      if (deletionRecord) {
        const updated = await prisma.$transaction(async (tx) => {
          await tx.session.deleteMany({ where: { userId: existing.id } });
          await tx.account.deleteMany({ where: { userId: existing.id } });
          await tx.resetToken.deleteMany({ where: { userId: existing.id } });
          await tx.project.deleteMany({ where: { userId: existing.id } });
          await tx.verificationToken.deleteMany({
            where: { identifier: { contains: existing.id } },
          });
          await tx.user.deleteMany({ where: { id: existing.id } });
          return tx.user.create({
            data: {
              email: normalizedEmail,
              name: name ?? null,
              password: hashed,
            },
            select: { id: true },
          });
        });
        userId = updated.id;
      } else if (existing.password && existing.emailVerified) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      } else {
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
      }
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
