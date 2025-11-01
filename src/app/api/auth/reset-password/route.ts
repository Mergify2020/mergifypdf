import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/hash";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    const rt = await prisma.resetToken.findUnique({ where: { token } });
    if (!rt || rt.expiresAt < new Date()) {
      return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 400 });
    }

    const hashed = hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({ where: { id: rt.userId }, data: { password: hashed } }),
      prisma.resetToken.delete({ where: { token } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
