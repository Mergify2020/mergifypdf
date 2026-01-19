import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

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

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const existing = await prisma.project.findFirst({
    where: { id, userId, trashedAt: null },
    select: {
      id: true,
      userId: true,
      name: true,
      data: true,
      previewKey: true,
      pdfKey: true,
      pagesCount: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const baseName = (existing.name ?? "Untitled project").trim() || "Untitled project";
  const copyName = baseName.endsWith(" (copy)") ? `${baseName} 2` : `${baseName} (copy)`;

  const duplicated = await prisma.project.create({
    data: {
      userId,
      name: copyName,
      data: existing.data,
      previewKey: null,
      pdfKey: existing.pdfKey,
      pagesCount: existing.pagesCount ?? 0,
    },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      previewKey: true,
      pdfKey: true,
      pagesCount: true,
    },
  });

  const { pdfKey: _pdfKey, previewKey: _previewKey, ...rest } = duplicated;
  return NextResponse.json({
    project: {
      ...rest,
      hasPdf: !!duplicated.pdfKey,
      hasPreview: !!duplicated.previewKey,
      pdfUrl: null,
      previewUrl: null,
    },
  });
}
