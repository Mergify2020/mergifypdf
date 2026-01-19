import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

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

async function ensureDbConnection() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await prisma.$connect();
      return;
    } catch (err: any) {
      const code = err?.code;
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

    return NextResponse.json(
      {
        projects: projects.map((project) => {
          const derivedPagesCount = extractPagesCountFromData(project.data);
          return {
            id: project.id,
            name: project.name,
            updatedAt: project.updatedAt,
            hasPreview: !!project.previewKey,
            hasPdf: !!project.pdfKey,
            pagesCount: project.pagesCount ?? derivedPagesCount ?? 0,
            rotation: extractRotationFromData(project.data) ?? 0,
          };
        }),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const projects = await prisma.project.findMany({
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
      break;
    } catch (err: any) {
      const code = err?.code;
      if (attempt === 0 && (code === "P1017" || code === "P1001")) {
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
