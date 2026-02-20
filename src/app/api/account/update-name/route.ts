import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestGuards";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (fullName.length > 120) {
    return NextResponse.json({ error: "Name is too long." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: fullName.length > 0 ? fullName : null },
  });

  return NextResponse.json({ success: true, name: fullName.length > 0 ? fullName : null });
}
