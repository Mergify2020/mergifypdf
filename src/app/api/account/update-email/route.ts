import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

const MAX_IMAGE_LENGTH = 1_000_000;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  if (Object.prototype.hasOwnProperty.call(body, "image")) {
    const raw = typeof body.image === "string" ? body.image.trim() : "";
    if (!raw) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { image: null },
      });
      return NextResponse.json({ success: true });
    }
    if (raw.length > MAX_IMAGE_LENGTH) {
      return NextResponse.json({ error: "Image is too large." }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: raw },
    });
    return NextResponse.json({ success: true });
  }

  const providers = session.user.providers ?? [];
  const canManageEmail = providers.length === 0 || providers.includes("credentials");
  if (!canManageEmail) {
    const managedByGoogle = providers.includes("google");
    return NextResponse.json(
      {
        error: managedByGoogle
          ? "Your email is handled by Google."
          : "Email changes are disabled for your sign-in method.",
      },
      { status: 403 }
    );
  }

  const email = typeof body.email === "string" ? body.email : "";
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
