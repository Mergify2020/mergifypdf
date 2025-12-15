import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

async function ensureDbConnection() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await prisma.$connect();
      return;
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err ? (err as { code?: unknown }).code : null;
      if (code === "P1017" || code === "P1001") {
        try {
          await prisma.$disconnect();
        } catch {
          // ignore
        }
        await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

function derivePreviewMeta(data: unknown): { previewUrl: string | null; pagesCount: number } {
  let previewUrl: string | null = null;
  let pagesCount = 0;

  if (data && typeof data === "object") {
    const payload = data as Record<string, unknown>;

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

  try {
    await ensureDbConnection();
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const userId = session.user.id;

  const project = await prisma.project.findUnique({ where: { id } });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (project.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  try {
    await ensureDbConnection();
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const userId = session.user.id;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name : undefined;
  const data = "data" in body ? body.data : undefined;

  const existing =
    data === undefined
      ? await prisma.project.findUnique({
          where: { id },
          select: { id: true, userId: true, name: true },
        })
      : await prisma.project.findUnique({
          where: { id },
        });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated =
    data === undefined
      ? await prisma.project.update({
          where: { id: existing.id },
          data: {
            name: name ?? existing.name,
          },
        })
      : (() => {
          const existingWithData = existing as typeof existing & { data: unknown };
          const nextData = (data ?? existingWithData.data) as
            | Prisma.InputJsonValue
            | Prisma.NullTypes.JsonNull;
          const { previewUrl, pagesCount } = derivePreviewMeta(nextData);
          return prisma.project.update({
            where: { id: existing.id },
            data: {
              name: name ?? existing.name,
              data: nextData,
              previewUrl,
              pagesCount,
            },
          });
        })();

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

  try {
    await ensureDbConnection();
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const userId = session.user.id;

  const existing = await prisma.project.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.project.delete({
    where: { id: existing.id },
  });

  return NextResponse.json({ success: true });
}
