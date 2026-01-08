import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

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
            pagesCount: number | null;
            data: unknown;
          }[]
        >`
          SELECT
            id,
            name,
            "updatedAt",
            "previewUrl" as "storedPreviewUrl",
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
            pagesCount: number | null;
            data: unknown;
          }[]
        >`
          SELECT
            id,
            name,
            "updatedAt",
            "previewUrl" as "storedPreviewUrl",
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
          return {
            id: project.id,
            name: project.name,
            updatedAt: project.updatedAt,
            previewUrl: project.storedPreviewUrl ?? null,
            pagesCount: project.pagesCount ?? 0,
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
