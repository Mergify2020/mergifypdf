import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { issueLoginTwoFactorCode } from "@/lib/twoFactorLogin";
import { isSameOrigin } from "@/lib/requestGuards";
import { rateLimit } from "@/lib/rateLimit";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Invalid origin" }, { status: 403 });
  }
  const limit = await rateLimit(req, { keyPrefix: "2fa-challenge", windowMs: 60_000, max: 5 });
  if (!limit.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const force = body && body.force === true;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      twoFactorEnabled: true,
      twoFactorMethod: true,
    },
  });

  if (!user || !user.twoFactorEnabled || user.twoFactorMethod !== "email") {
    return NextResponse.json(
      {
        ok: false,
        code: "TWO_FACTOR_NOT_ENABLED",
        message: "Two-factor authentication is not enabled for this account.",
      },
      { status: 400 }
    );
  }

  const result = await issueLoginTwoFactorCode(session.user.id, user.email, force);

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

  return NextResponse.json({ ok: true });
}
