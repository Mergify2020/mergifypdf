import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing && existing.id !== session.user.id) {
    return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { email: normalized },
  });

  return NextResponse.json({ success: true });
}
