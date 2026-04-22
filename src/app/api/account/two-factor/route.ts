import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import {
  clearTwoFactorSetupCodes,
  issueTwoFactorDisableCode,
  issueTwoFactorSetupCode,
} from "@/lib/twoFactorVerification";
import { isSameOrigin } from "@/lib/requestGuards";
import { rateLimit } from "@/lib/rateLimit";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

function googleManagedAccount(providers: string[] | undefined) {
  return Array.isArray(providers) && providers.includes("google") && !providers.includes("credentials");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();
  if (googleManagedAccount(session.user.providers)) {
    return NextResponse.json({
      ok: true,
      enabled: false,
      method: null,
      phone: null,
      email: session.user.email ?? null,
    });
  }

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
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Invalid origin" }, { status: 403 });
  }
  const limit = await rateLimit(req, { keyPrefix: "2fa-setup-send", windowMs: 60_000, max: 5 });
  if (!limit.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();
  if (googleManagedAccount(session.user.providers)) {
    return NextResponse.json(
      {
        ok: false,
        code: "GOOGLE_MANAGED",
        message: "Two-factor authentication is not available for Google sign-in accounts.",
      },
      { status: 403 }
    );
  }

  const userId = session.user.id;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const action = body.action === "disable" ? "disable" : "enable";
  const email = session.user.email ?? null;

  if (action === "disable") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
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

    const result = await issueTwoFactorDisableCode(userId, user.email ?? email);
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

    return NextResponse.json({ ok: true, method: "email" });
  }

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

export async function DELETE(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Invalid origin" }, { status: 403 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();
  if (googleManagedAccount(session.user.providers)) {
    return NextResponse.json(
      {
        ok: false,
        code: "GOOGLE_MANAGED",
        message: "Two-factor authentication is not available for Google sign-in accounts.",
      },
      { status: 403 }
    );
  }

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
