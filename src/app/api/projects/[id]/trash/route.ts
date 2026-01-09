import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const existing = await prisma.project.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const baseData = (existing.data ?? {}) as Prisma.InputJsonObject;
  const payload: Prisma.InputJsonObject = {
    ...baseData,
    trashed: true,
  };

  await prisma.project.updateMany({
    where: { id: existing.id, userId },
    data: { data: payload },
  });
  const updated = await prisma.project.findFirst({ where: { id: existing.id, userId } });
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ project: updated });
}
