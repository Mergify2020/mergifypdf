# From your project root
New-Item -ItemType Directory -Force "src\app\api\dev\reset-status" | Out-Null
@'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ⚠ Keep this equal to the value in /api/auth/request-reset
const THROTTLE_MS = 2 * 60 * 1000; // 2 minutes

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    if (!email) {
      return NextResponse.json({ ok: false, error: "missing email" }, { status: 400 });
    }

    // Look up user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ ok: true, exists: false, throttled: false });
    }

    // Most recent reset token
    const last = await prisma.resetToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, expiresAt: true },
    });

    if (!last) {
      return NextResponse.json({
        ok: true,
        exists: true,
        throttled: false,
        lastCreatedAt: null,
      });
    }

    const now = Date.now();
    const lastMs = last.createdAt.getTime();
    const throttled = lastMs > (now - THROTTLE_MS);

    return NextResponse.json({
      ok: true,
      exists: true,
      throttled,
      lastCreatedAt: last.createdAt.toISOString(),
      ageSec: Math.floor((now - lastMs) / 1000),
      throttleWindowSec: Math.floor(THROTTLE_MS / 1000),
      windowRemainingSec: throttled ? Math.max(0, Math.ceil((THROTTLE_MS - (now - lastMs)) / 1000)) : 0,
    });
  } catch (e) {
    console.error("[reset-status] error:", e);
    return NextResponse.json({ ok: false, error: "unexpected" }, { status: 500 });
  }
}
'@ | Set-Content "src/app/api/dev/reset-status/route.ts"
