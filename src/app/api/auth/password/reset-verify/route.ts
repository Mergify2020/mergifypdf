import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  if (!token || !email) {
    return NextResponse.redirect(new URL("/forgot-password", req.url));
  }

  const vt = await prisma.verificationToken.findFirst({
    where: { identifier: email, token },
  });

  if (!vt || vt.expires < new Date()) {
    return NextResponse.redirect(new URL("/forgot-password", req.url));
  }

  // Token is valid: set short-lived HttpOnly cookie and redirect to reset form
  const res = NextResponse.redirect(new URL(`/reset-password?email=${encodeURIComponent(email)}`, req.url));

  // 15 minutes max
  const maxAge = 15 * 60;
  res.cookies.set("reset_ok", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  return res;
}
