import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { clearTwoFactorSetupCodes, issueTwoFactorSetupCode } from "@/lib/twoFactorVerification";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      twoFactorEnabled: true,
      twoFactorMethod: true,
      twoFactorPhone: true,
    },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  const enabled = user.twoFactorEnabled ?? false;
  const method = enabled ? (user.twoFactorMethod as "email" | null) ?? null : null;

  return NextResponse.json({
    ok: true,
    enabled,
    method,
    phone: enabled ? user.twoFactorPhone ?? null : null,
    email: user.email ?? null,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const userId = session.user.id;
  const email = session.user.email ?? null;

  const result = await issueTwoFactorSetupCode(userId, email);

  if (!result.ok) {
    if (result.error === "EMAIL_MISSING") {
      return NextResponse.json(
        {
          ok: false,
          code: "EMAIL_MISSING",
          message: "We could not find an email address for your account.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: "EMAIL_SEND_FAILED",
        message: "We couldn’t send your verification code. Please try again.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    method: "email",
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  });

  if (!user?.twoFactorEnabled) {
    return NextResponse.json(
      {
        ok: false,
        code: "NOT_ENABLED",
        message: "Two-factor authentication is not enabled for this account.",
      },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorMethod: "email",
      twoFactorPhone: null,
    },
  });

  return NextResponse.json({
    ok: true,
    method: "email",
    phone: null,
  });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorMethod: null,
      twoFactorPhone: null,
    },
  });

  await clearTwoFactorSetupCodes(session.user.id);

  return NextResponse.json({ ok: true });
}
