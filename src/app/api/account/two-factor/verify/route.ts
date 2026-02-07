import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTwoFactorSetupCode } from "@/lib/twoFactorVerification";
import { isSameOrigin } from "@/lib/requestGuards";
import { rateLimit } from "@/lib/rateLimit";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Invalid origin" }, { status: 403 });
  }
  const limit = await rateLimit(req, { keyPrefix: "2fa-setup-verify", windowMs: 60_000, max: 8 });
  if (!limit.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/authOptions");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const userId = session.user.id;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const rawCode = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(rawCode)) {
    return NextResponse.json(
      {
        ok: false,
        code: "BAD_CODE",
        message: "Enter the 6-digit code.",
      },
      { status: 400 }
    );
  }

  const result = await verifyTwoFactorSetupCode(userId, rawCode);
  if (!result.ok) {
    const status = 400;
    if (result.code === "invalid_code") {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_code",
          message: "That code doesn’t match. Try again.",
        },
        { status }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: "expired",
        message: "That code has expired. Request a new one.",
      },
      { status }
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
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
