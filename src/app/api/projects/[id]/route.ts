import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { createSignedR2Url, getR2Config, uploadR2Object } from "@/lib/r2";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function extractPagesCount(data: unknown) {
  if (!data || typeof data !== "object") return 0;
  const pages = (data as { pages?: unknown }).pages;
  return Array.isArray(pages) ? pages.length : 0;
}

function parseDataImageUrl(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1], data: match[2] };
}

async function uploadPreviewFromDataUrl(
  dataUrl: string,
  projectId: string,
  r2: ReturnType<typeof getR2Config>,
) {
  const parsed = parseDataImageUrl(dataUrl);
  if (!parsed) {
    throw new Error("Invalid preview data URL");
  }

  const buffer = Buffer.from(parsed.data, "base64");
  const objectKey = `${projectId}.webp`;
  await uploadR2Object(r2, objectKey, buffer, parsed.mime);
  return objectKey;
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

  const project = await prisma.project.findFirst({ where: { id, userId } });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let signedPdfUrl: string | null = null;
  let signedPreviewUrl: string | null = null;
  if (project.pdfKey || project.previewKey) {
    let r2Config;
    try {
      r2Config = getR2Config();
      } catch (err) {
        console.error("R2 config missing when signing project URLs.", {
          projectId: id,
          env: process.env.NODE_ENV,
          error: err,
        });
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "R2 storage is not configured" },
        { status: 500 }
      );
    }
    if (project.pdfKey) {
      signedPdfUrl = await createSignedR2Url(r2Config, project.pdfKey);
    }
    if (project.previewKey) {
      signedPreviewUrl = await createSignedR2Url(r2Config, project.previewKey);
    }
  }

  const hasPagesCount = typeof project.pagesCount === "number" && project.pagesCount > 0;
  if (!hasPagesCount) {
    const nextPagesCount = extractPagesCount(project.data);
    if (nextPagesCount > 0) {
      await prisma.project.updateMany({
        where: { id: project.id, userId },
        data: { pagesCount: nextPagesCount },
      });
      const updated = await prisma.project.findFirst({ where: { id: project.id, userId } });
      if (!updated) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const { pdfKey: _pdfKey, previewKey: _previewKey, ...rest } = updated;
      return NextResponse.json(
        {
          project: {
            ...rest,
            hasPdf: !!updated.pdfKey,
            hasPreview: !!updated.previewKey,
            pdfUrl: signedPdfUrl,
            previewUrl: signedPreviewUrl,
          },
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }
  }

  const { pdfKey: _pdfKey, previewKey: _previewKey, ...rest } = project;
  return NextResponse.json(
    {
      project: {
        ...rest,
        hasPdf: !!project.pdfKey,
        hasPreview: !!project.previewKey,
        pdfUrl: signedPdfUrl,
        previewUrl: signedPreviewUrl,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
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
  const previewUrlRaw = typeof body.previewUrl === "string" ? body.previewUrl.trim() : "";
  const existing =
    data === undefined
      ? await prisma.project.findFirst({
          where: { id, userId },
          select: { id: true, userId: true, name: true, previewKey: true },
        })
      : await prisma.project.findFirst({
          where: { id, userId },
        });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let resolvedPreviewKey: string | null | undefined = undefined;
  if (previewUrlRaw.length > 0) {
    if (previewUrlRaw.startsWith("data:image/")) {
      let r2Config;
      try {
        r2Config = getR2Config();
      } catch (err) {
        console.error("R2 config missing when uploading preview.", {
          projectId: id,
          env: process.env.NODE_ENV,
          error: err,
        });
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Preview storage is not configured" },
          { status: 500 }
        );
      }
      resolvedPreviewKey = await uploadPreviewFromDataUrl(previewUrlRaw, id, r2Config);
      console.info("Uploaded preview image to R2.", { projectId: id, env: process.env.NODE_ENV });
    } else {
      return NextResponse.json({ error: "Invalid preview payload" }, { status: 400 });
    }
  }

  if (data === undefined) {
    const existingPreviewKey =
      (existing as typeof existing & { previewKey?: string | null }).previewKey ?? null;
    await prisma.project.updateMany({
      where: { id: existing.id, userId },
      data: {
        name: name ?? existing.name,
        ...(resolvedPreviewKey || existingPreviewKey === null
          ? { previewKey: resolvedPreviewKey ?? existingPreviewKey }
          : {}),
      },
    });
  } else {
    const existingWithData = existing as typeof existing & { data: unknown };
    const nextData = (data ?? existingWithData.data) as
      | Prisma.InputJsonValue
      | Prisma.NullTypes.JsonNull;
    const existingPreviewKey =
      (existingWithData as { previewKey?: string | null }).previewKey ?? null;
    const existingPagesCount =
      typeof (existingWithData as { pagesCount?: unknown }).pagesCount === "number"
        ? ((existingWithData as { pagesCount?: number }).pagesCount as number)
        : 0;
    const derivedPagesCount = extractPagesCount(nextData);
    const nextPagesCount = derivedPagesCount > 0 ? derivedPagesCount : existingPagesCount;
    await prisma.project.updateMany({
      where: { id: existing.id, userId },
      data: {
        name: name ?? existing.name,
        data: nextData,
        previewKey: resolvedPreviewKey ?? existingPreviewKey,
        pagesCount: nextPagesCount,
      },
    });
  }

  const updated = await prisma.project.findFirst({ where: { id: existing.id, userId } });
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { pdfKey: _pdfKey, previewKey: _previewKey, ...rest } = updated;
  return NextResponse.json({
    project: {
      ...rest,
      hasPdf: !!updated.pdfKey,
      hasPreview: !!updated.previewKey,
    },
  });
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

  const existing = await prisma.project.findFirst({ where: { id, userId } });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.project.deleteMany({
    where: { id: existing.id, userId },
  });

  return NextResponse.json({ success: true });
}
