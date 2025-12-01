import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, SESSION_MAX_AGE } from "@/lib/authOptions";
import { verifyLoginTwoFactorCode } from "@/lib/twoFactorLogin";
import { decode, encode } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";
import { cookies } from "next/headers";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

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

  const result = await verifyLoginTwoFactorCode(session.user.id, rawCode);
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

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error("[2fa-login] NEXTAUTH_SECRET is not set.");
    return NextResponse.json(
      { ok: false, code: "SERVER_ERROR", message: "Unable to complete verification." },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";
  const rawToken = cookieStore.get(cookieName)?.value;

  if (!rawToken) {
    return NextResponse.json(
      { ok: false, code: "NO_SESSION", message: "Session not found." },
      { status: 401 }
    );
  }

  const decoded = (await decode({ token: rawToken, secret })) as JWT | null;
  if (!decoded) {
    return NextResponse.json(
      { ok: false, code: "BAD_SESSION", message: "Session not found." },
      { status: 401 }
    );
  }

  decoded.twoFactorPassed = true;

  const newJwt = await encode({
    token: decoded,
    secret,
    maxAge: SESSION_MAX_AGE,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName, newJwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return res;
}
