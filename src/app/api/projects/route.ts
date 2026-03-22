import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import {
  clearPrismaDatabaseUnavailable,
  isPrismaDatabaseCooldownActive,
  markPrismaDatabaseUnavailable,
  prisma,
} from "@/lib/prisma";
import { getR2Config, getR2ObjectSize } from "@/lib/r2";
import { isSameOrigin } from "@/lib/requestGuards";

function extractPagesCountFromData(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const pages = Array.isArray(record.pages) ? record.pages : null;
  return pages ? pages.length : null;
}

function extractRotationFromData(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const pages = Array.isArray(record.pages) ? record.pages : null;
  if (!pages || pages.length === 0) return null;
  const first = pages[0];
  if (!first || typeof first !== "object") return null;
  const rotation =
    typeof (first as { rotation?: unknown }).rotation === "number"
      ? (first as { rotation: number }).rotation
      : null;
  return rotation;
}

function extractFileSizeFromData(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const sources = Array.isArray(record.sources) ? record.sources : null;
  if (!sources || sources.length === 0) return null;

  const sizes = sources
    .map((source) =>
      source && typeof source === "object" && typeof (source as { size?: unknown }).size === "number"
        ? (source as { size: number }).size
        : null
    )
    .filter((size): size is number => typeof size === "number" && Number.isFinite(size) && size >= 0);

  if (sizes.length === 0) return null;
  return sizes.reduce((total, size) => total + size, 0);
}

async function ensureDbConnection() {
  if (isPrismaDatabaseCooldownActive()) {
    throw new Error("PRISMA_DB_COOLDOWN_ACTIVE");
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await prisma.$connect();
      clearPrismaDatabaseUnavailable();
      return;
    } catch (err: any) {
      const code = err?.code;
      if (code === "P1017" || code === "P1001") {
        markPrismaDatabaseUnavailable(err);
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

export async function GET(request: NextRequest) {
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
  const summary = request.nextUrl.searchParams.get("summary");
  const trashedParam = request.nextUrl.searchParams.get("trashed");
  const trashed = trashedParam === "1" || trashedParam === "true";
  const trashedFilter = trashed ? { not: null } : null;

  // Lightweight summary payload used by the All Projects grid.
  if (summary === "1") {
    try {
      let r2Config: ReturnType<typeof getR2Config> | null = null;
      try {
        r2Config = getR2Config();
      } catch {
        r2Config = null;
      }

      const projects = await prisma.project.findMany({
        where: { userId, trashedAt: trashedFilter },
        orderBy: { updatedAt: "desc" },
        take: 60,
        select: {
          id: true,
          name: true,
          updatedAt: true,
          previewKey: true,
          pdfKey: true,
          pagesCount: true,
          data: true,
        },
      });
      clearPrismaDatabaseUnavailable();

      return NextResponse.json(
        {
          projects: await Promise.all(projects.map(async (project) => {
            const derivedPagesCount = extractPagesCountFromData(project.data);
            let fileSizeBytes: number | null = null;
            if (r2Config && project.pdfKey) {
              try {
                fileSizeBytes = await getR2ObjectSize(r2Config, project.pdfKey);
              } catch {
                fileSizeBytes = extractFileSizeFromData(project.data);
              }
            } else {
              fileSizeBytes = extractFileSizeFromData(project.data);
            }

            return {
              id: project.id,
              name: project.name,
              updatedAt: project.updatedAt,
              hasPreview: !!project.previewKey,
              hasPdf: !!project.pdfKey,
              pagesCount: project.pagesCount ?? derivedPagesCount ?? 0,
              rotation: extractRotationFromData(project.data) ?? 0,
              fileSizeBytes,
            };
          })),
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    } catch (error) {
      markPrismaDatabaseUnavailable(error);
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
  }

  let projects;
  try {
    projects = await prisma.project.findMany({
      where: { userId, trashedAt: trashedFilter },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        data: true,
        pdfKey: true,
        previewKey: true,
        createdAt: true,
        updatedAt: true,
        pagesCount: true,
      },
    });
    clearPrismaDatabaseUnavailable();
  } catch (error) {
    markPrismaDatabaseUnavailable(error);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const sanitized = projects.map((project) => {
    const { pdfKey: _pdfKey, previewKey: _previewKey, ...rest } = project;
    return {
      ...rest,
      hasPreview: !!project.previewKey,
      hasPdf: !!project.pdfKey,
    };
  });
  return NextResponse.json(
    { projects: sanitized },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
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

  const body = await req.json().catch(() => ({}));
  const { name, data } = body;

  if (!name || data === undefined) {
    return NextResponse.json(
      { error: "name and data are required" },
      { status: 400 }
    );
  }

  const pagesCount =
    data && typeof data === "object" && Array.isArray((data as { pages?: unknown }).pages)
      ? (data as { pages: unknown[] }).pages.length
      : 0;

  let project;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      project = await prisma.project.create({
        data: {
          name,
          data,
          previewKey: null,
          pdfKey: null,
          pagesCount,
          userId,
        },
      });
      clearPrismaDatabaseUnavailable();
      break;
    } catch (err: any) {
      const code = err?.code;
      if (attempt === 0 && (code === "P1017" || code === "P1001")) {
        markPrismaDatabaseUnavailable(err);
        try {
          await prisma.$disconnect();
        } catch {
          // ignore
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
        continue;
      }
      throw err;
    }
  }

  return NextResponse.json({ project });
}
