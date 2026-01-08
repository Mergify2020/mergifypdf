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

function withoutTrashedFlag(data: Prisma.JsonValue): Prisma.InputJsonValue | Prisma.NullTypes.JsonNull {
  if (data === null) return Prisma.JsonNull;
  if (Array.isArray(data)) return data as Prisma.InputJsonArray;
  if (typeof data !== "object") return data as Prisma.InputJsonValue;

  const record = data as Record<string, Prisma.JsonValue>;
  if (!Object.prototype.hasOwnProperty.call(record, "trashed")) return data as Prisma.InputJsonObject;

  const { trashed: _trashed, ...rest } = record;
  void _trashed;
  return rest as Prisma.InputJsonObject;
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

  const existing = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      name: true,
      data: true,
      previewUrl: true,
      pdfUrl: true,
      pagesCount: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const baseName = (existing.name ?? "Untitled project").trim() || "Untitled project";
  const copyName = baseName.endsWith(" (copy)") ? `${baseName} 2` : `${baseName} (copy)`;

  const duplicated = await prisma.project.create({
    data: {
      userId,
      name: copyName,
      data: withoutTrashedFlag(existing.data),
      previewUrl: null,
      pdfUrl: existing.pdfUrl,
      pagesCount: existing.pagesCount ?? 0,
    },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      previewUrl: true,
      pagesCount: true,
    },
  });

  return NextResponse.json({ project: duplicated });
}
