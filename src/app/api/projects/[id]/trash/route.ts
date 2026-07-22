import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/requestGuards";
import { toSafeProjectDto } from "@/lib/projectDto";
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(_req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
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

  // Soft delete: mark project as trashed without removing any R2 assets.
  await prisma.project.updateMany({
    where: { id: existing.id, userId },
    data: { trashedAt: new Date() },
  });
  const updated = await prisma.project.findFirst({ where: { id: existing.id, userId } });
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ project: toSafeProjectDto(updated) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(_req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
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

  // Restore: clear trashedAt so the project returns to normal lists.
  await prisma.project.updateMany({
    where: { id: existing.id, userId },
    data: { trashedAt: null },
  });
  const updated = await prisma.project.findFirst({ where: { id: existing.id, userId } });
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ project: toSafeProjectDto(updated) });
}
