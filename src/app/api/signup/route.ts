import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.password) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 12);
    // If a user exists via OAuth later, allow adding a password
    const user = await prisma.user.upsert({
      where: { email },
      update: { password: hash, name: name ?? undefined },
      create: { email, password: hash, name },
    });

    return NextResponse.json({ ok: true, id: user.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
