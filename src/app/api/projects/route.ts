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

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const summary = request.nextUrl.searchParams.get("summary");
  const trashedParam = request.nextUrl.searchParams.get("trashed");
  const trashed = trashedParam === "1" || trashedParam === "true";

  // Lightweight summary payload used by the All Projects grid.
  if (summary === "1") {
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 80,
      select: {
        id: true,
        name: true,
        updatedAt: true,
        previewUrl: true,
        pagesCount: true,
        data: true,
      },
    });

    const shaped = projects
      .map((project) => {
        const payload = project.data as
          | {
              trashed?: boolean;
            }
          | null;
        const isTrashed = payload?.trashed === true;
        if (trashed && !isTrashed) return null;
        if (!trashed && isTrashed) return null;
        return {
          id: project.id,
          name: project.name,
          updatedAt: project.updatedAt,
          previewUrl: project.previewUrl ?? null,
          pagesCount: project.pagesCount ?? 0,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({ projects: shaped });
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

  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const { name, data } = body;
  const { previewUrl, pagesCount } = derivePreviewMeta(data);

  if (!name || data === undefined) {
    return NextResponse.json(
      { error: "name and data are required" },
      { status: 400 }
    );
  }

  const project = await prisma.project.create({
    data: {
      name,
      data,
      previewUrl,
      pagesCount,
      userId,
    },
  });

  return NextResponse.json({ project });
}
