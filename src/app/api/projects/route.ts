import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

function extractPreviewFromData(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const pageThumbs = Array.isArray(record.pageThumbs) ? record.pageThumbs : null;
  if (pageThumbs) {
    const candidate = pageThumbs.find(
      (item) => typeof item === "string" && item.length > 0
    ) as string | undefined;
    if (candidate && (candidate.startsWith("data:image/") || candidate.startsWith("/previews/"))) {
      return candidate;
    }
  }
  const pages = Array.isArray(record.pages) ? record.pages : null;
  if (!pages || pages.length === 0) return null;
  const first = pages[0];
  if (!first || typeof first !== "object") return null;
  const preview =
    typeof (first as { preview?: unknown }).preview === "string"
      ? (first as { preview: string }).preview
      : null;
  if (preview && (preview.startsWith("data:image/") || preview.startsWith("/previews/"))) {
    return preview;
  }
  const thumb =
    typeof (first as { thumb?: unknown }).thumb === "string"
      ? (first as { thumb: string }).thumb
      : null;
  if (thumb && (thumb.startsWith("data:image/") || thumb.startsWith("/previews/"))) {
    return thumb;
  }
  return null;
}

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

  // Lightweight summary payload used by the All Projects grid.
  if (summary === "1") {
    const projects = trashed
      ? await prisma.$queryRaw<
          {
            id: string;
            name: string;
            updatedAt: Date;
            storedPreviewUrl: string | null;
            pdfUrl: string | null;
            pagesCount: number | null;
            data: unknown;
          }[]
        >`
          SELECT
            id,
            name,
            "updatedAt",
            "previewUrl" as "storedPreviewUrl",
            "pdfUrl",
            "pagesCount",
            data
          FROM "Project"
          WHERE "userId" = ${userId}
            AND COALESCE((data->>'trashed')::boolean, false) = true
          ORDER BY "updatedAt" DESC
          LIMIT 60
        `
      : await prisma.$queryRaw<
          {
            id: string;
            name: string;
            updatedAt: Date;
            storedPreviewUrl: string | null;
            pdfUrl: string | null;
            pagesCount: number | null;
            data: unknown;
          }[]
        >`
          SELECT
            id,
            name,
            "updatedAt",
            "previewUrl" as "storedPreviewUrl",
            "pdfUrl",
            "pagesCount",
            data
          FROM "Project"
          WHERE "userId" = ${userId}
            AND COALESCE((data->>'trashed')::boolean, false) = false
          ORDER BY "updatedAt" DESC
          LIMIT 60
        `;

    return NextResponse.json(
      {
        projects: projects.map((project) => {
          const derivedPreview = extractPreviewFromData(project.data);
          const derivedPagesCount = extractPagesCountFromData(project.data);
          return {
            id: project.id,
            name: project.name,
            updatedAt: project.updatedAt,
            previewUrl: derivedPreview ?? project.storedPreviewUrl ?? null,
            pdfUrl: project.pdfUrl ?? null,
            pagesCount: project.pagesCount ?? derivedPagesCount ?? 0,
            rotation: extractRotationFromData(project.data) ?? 0,
          };
        }),
      },
      {
        headers: {
          // User-specific; allow short-lived browser caching to speed app navigation.
          "Cache-Control": "private, max-age=30, stale-while-revalidate=300",
        },
      }
    );
  }

  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ projects });
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
          previewUrl: null,
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
