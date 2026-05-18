import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { createSignedR2Url, getR2Config } from "@/lib/r2";
import { isSameOrigin } from "@/lib/requestGuards";

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

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(_req)) {
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
  const project = await prisma.project.findFirst({
    where: { id, userId, trashedAt: null },
    select: { id: true, userId: true, previewKey: true, pdfKey: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(
    { error: "Server-side preview generation is disabled" },
    { status: 410 }
  );
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
  let project: { previewKey: string | null } | null = null;
  try {
    project = await prisma.project.findFirst({
      where: { id, userId, trashedAt: null },
      select: { previewKey: true },
    });
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err ? (err as { code?: unknown }).code : null;
    if (code === "P1017" || code === "P1001") {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }
    throw err;
  }

  if (!project?.previewKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let r2Config;
  try {
    r2Config = getR2Config();
  } catch (err) {
    console.error("R2 config missing when signing preview URL.", {
      projectId: id,
      env: process.env.NODE_ENV,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Preview storage is not configured" },
      { status: 500 }
    );
  }

  const url = await createSignedR2Url(r2Config, project.previewKey, 60);

  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Preview fetch failed with status ${upstream.status}` },
      { status: 502 }
    );
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) {
    headers.set("Content-Length", contentLength);
  }
  headers.set("Cache-Control", "no-store");

  console.info("Proxied preview image from R2.", {
    projectId: id,
    env: process.env.NODE_ENV,
    status: upstream.status,
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}
