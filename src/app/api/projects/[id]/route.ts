import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

function derivePreviewMeta(data: unknown): { previewUrl: string | null; pagesCount: number } {
  let previewUrl: string | null = null;
  let pagesCount = 0;

  if (data && typeof data === "object") {
    const payload = data as any;

    if (typeof payload.previewUrl === "string" && payload.previewUrl.length > 0) {
      previewUrl = payload.previewUrl;
    } else if (
      typeof payload.firstPageThumb === "string" &&
      payload.firstPageThumb.length > 0
    ) {
      previewUrl = payload.firstPageThumb;
    }

    if (typeof payload.pagesCount === "number" && Number.isFinite(payload.pagesCount)) {
      pagesCount = payload.pagesCount;
    } else if (Array.isArray(payload.pages)) {
      pagesCount = payload.pages.length;
    }
  }

  return { previewUrl, pagesCount };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const project = await prisma.project.findFirst({
    where: { id, userId },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { name, data } = await req.json();

  const existing = await prisma.project.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nextData = data ?? existing.data;
  const { previewUrl, pagesCount } = derivePreviewMeta(nextData);

  const updated = await prisma.project.update({
    where: { id: existing.id },
    data: {
      name: name ?? existing.name,
      data: nextData,
      previewUrl,
      pagesCount,
    },
  });

  return NextResponse.json({ project: updated });
}

export async function DELETE(
  req: NextRequest,
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

  await prisma.project.delete({
    where: { id: existing.id },
  });

  return NextResponse.json({ success: true });
}
