import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: "Missing token or password" }, { status: 400 });
    }

    const rt = await prisma.resetToken.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!rt || rt.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: rt.userId },
      data: { password: hashed },
    });

    await prisma.resetToken.delete({ where: { token } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("reset-confirm error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
