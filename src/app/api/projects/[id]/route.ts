import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { createSignedR2Url, deleteR2Objects, getR2Config, uploadR2Object } from "@/lib/r2";
import { Prisma } from "@prisma/client";
import { isSameOrigin } from "@/lib/requestGuards";
import { logDevTiming } from "@/lib/devTiming";

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

async function uploadPreviewWithRetry(
  dataUrl: string,
  projectId: string,
  r2: ReturnType<typeof getR2Config>,
  attempts = 3,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await uploadPreviewFromDataUrl(dataUrl, projectId, r2);
    } catch (err) {
      if (err instanceof Error && err.message === "Invalid preview data URL") {
        throw err;
      }
      lastError = err;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
      }
    }
  }
  throw lastError;
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

  const project = await prisma.project.findFirst({ where: { id, userId, trashedAt: null } });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const secureStorageEnabled = process.env.STORAGE_MODEL_V2_ENABLED === "true";
  const [secureSourceAsset, latestSecureUpload] = secureStorageEnabled
    ? await Promise.all([
        prisma.projectAsset.findFirst({
          where: {
            projectId: project.id,
            role: "SOURCE",
            deletedAt: null,
            storageObject: { ownerId: userId, status: "READY", deletedAt: null },
          },
          orderBy: { revision: "desc" },
          select: {
            id: true,
            storageObject: { select: { byteLength: true, sha256: true } },
          },
        }),
        prisma.uploadSession.findFirst({
          where: { projectId: project.id, ownerId: userId },
          orderBy: { createdAt: "desc" },
          select: { status: true, safeErrorCode: true },
        }),
      ])
    : [null, null];
  const secureStorageFields = {
    secureStorageEnabled,
    secureSourceAvailable: Boolean(secureSourceAsset),
    sourceAssetId: secureSourceAsset?.id ?? null,
    sourceByteLength: secureSourceAsset?.storageObject.byteLength
      ? Number(secureSourceAsset.storageObject.byteLength)
      : null,
    sourceSha256: secureSourceAsset?.storageObject.sha256 ?? null,
    secureUploadStatus: latestSecureUpload?.status ?? null,
    secureUploadErrorCode: latestSecureUpload?.safeErrorCode ?? null,
  };

  let signedPdfUrl: string | null = null;
  let previewUrl: string | null = null;
  if ((project.pdfKey && !secureSourceAsset) || project.previewKey) {
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
    if (project.pdfKey && !secureSourceAsset) {
      signedPdfUrl = await createSignedR2Url(r2Config, project.pdfKey);
    }
    if (project.previewKey) {
      previewUrl = `/api/projects/${id}/thumbnail`;
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
      const updated = await prisma.project.findFirst({
        where: { id: project.id, userId, trashedAt: null },
      });
      if (!updated) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const { pdfKey: _pdfKey, previewKey: _previewKey, ...rest } = updated;
      return NextResponse.json(
        {
          project: {
            ...rest,
            hasPdf: !!updated.pdfKey || Boolean(secureSourceAsset),
            hasPreview: !!updated.previewKey,
            pdfUrl: signedPdfUrl,
            previewUrl,
            ...secureStorageFields,
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
        hasPdf: !!project.pdfKey || Boolean(secureSourceAsset),
        hasPreview: !!project.previewKey,
        pdfUrl: signedPdfUrl,
        previewUrl,
        ...secureStorageFields,
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
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
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
          where: { id, userId, trashedAt: null },
          select: { id: true, userId: true, name: true, previewKey: true, updatedAt: true },
        })
      : await prisma.project.findFirst({
          where: { id, userId, trashedAt: null },
        });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const shouldPreserveUpdatedAt =
    data === undefined && previewUrlRaw.length === 0 && typeof name === "string" && name !== existing.name;

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
      try {
        resolvedPreviewKey = await uploadPreviewWithRetry(previewUrlRaw, id, r2Config);
      } catch (err) {
        console.error("Preview upload failed after retries.", {
          projectId: id,
          env: process.env.NODE_ENV,
          error: err,
        });
        return NextResponse.json(
          { error: "Preview upload failed. Please try again." },
          { status: 502 }
        );
      }
      logDevTiming("project-preview", "upload-complete");
    } else {
      return NextResponse.json({ error: "Invalid preview payload" }, { status: 400 });
    }
  }

  if (data === undefined) {
    const existingPreviewKey =
      (existing as typeof existing & { previewKey?: string | null }).previewKey ?? null;
    if (shouldPreserveUpdatedAt) {
      await prisma.$executeRaw`
        UPDATE "Project"
        SET "name" = ${name ?? existing.name}
        WHERE "id" = ${existing.id} AND "userId" = ${userId}
      `;
    } else {
      await prisma.project.updateMany({
        where: { id: existing.id, userId },
        data: {
          name: name ?? existing.name,
          ...(resolvedPreviewKey || existingPreviewKey === null
            ? { previewKey: resolvedPreviewKey ?? existingPreviewKey }
            : {}),
        },
      });
    }
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
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
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

  // Hard delete: remove the project record first, then clean up R2 assets.
  await prisma.project.deleteMany({
    where: { id: existing.id, userId },
  });

  const keysToDelete = [existing.pdfKey, existing.previewKey].filter(
    (key): key is string => typeof key === "string" && key.length > 0
  );
  if (keysToDelete.length > 0) {
    try {
      const r2Config = getR2Config();
      await deleteR2Objects(r2Config, keysToDelete);
    } catch (err) {
      console.error("Failed to delete R2 objects for hard-deleted project.", {
        projectId: existing.id,
        error: err,
      });
    }
  }

  return NextResponse.json({ success: true });
}
