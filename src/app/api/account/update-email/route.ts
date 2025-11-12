import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providers = session.user.providers ?? [];
  const canManageEmail = providers.length === 0 || providers.includes("credentials");
  if (!canManageEmail) {
    const managedByGoogle = providers.includes("google");
    return NextResponse.json(
      { error: managedByGoogle ? "Your email is handled by Google." : "Email changes are disabled for your sign-in method." },
      { status: 403 }
    );
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
