import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Bad req" }, { status: 400 });

    // Read the HttpOnly cookie set by reset-verify
    const jar = cookies();
    const tokenCookie = jar.get("reset_ok");
    const token = tokenCookie?.value || "";

    if (!token) return NextResponse.json({ error: "No approval" }, { status: 400 });

    // Validate token row
    const vt = await prisma.verificationToken.findFirst({
      where: { identifier: email, token },
    });
    if (!vt || vt.expires < new Date()) {
      return NextResponse.json({ error: "Invalid/expired" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { email }, data: { password: hash } });

    // Consume token + clear cookie
    await prisma.verificationToken.delete({ where: { token } });

    const res = NextResponse.json({ ok: true });
    res.cookies.set("reset_ok", "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
