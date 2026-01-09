import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { createSignedR2Url, getR2Config, uploadR2Object } from "@/lib/r2";

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
  const project = await prisma.project.findFirst({
    where: { id, userId },
    select: { id: true, userId: true, previewKey: true, pdfKey: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const pdfKey = typeof body.pdfKey === "string" ? body.pdfKey.trim() : "";
    if (!pdfKey || pdfKey !== `${id}.pdf`) {
      return NextResponse.json({ error: "Invalid PDF key" }, { status: 400 });
    }
    await prisma.project.updateMany({
      where: { id: project.id, userId },
      data: { pdfKey },
    });
    return NextResponse.json({ success: true });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing PDF file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let r2Config;
  try {
    r2Config = getR2Config();
  } catch {
    return NextResponse.json({ error: "PDF storage is not configured" }, { status: 500 });
  }

  const objectKey = `${id}.pdf`;
  await uploadR2Object(r2Config, objectKey, buffer, "application/pdf");

  await prisma.project.updateMany({
    where: { id: project.id, userId },
    data: { pdfKey: objectKey },
  });

  return NextResponse.json({ success: true });
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

  const userId = session.user.id;
  const project = await prisma.project.findFirst({
    where: { id, userId },
    select: { pdfKey: true },
  });

  if (!project?.pdfKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let r2Config;
  try {
    r2Config = getR2Config();
  } catch {
    return NextResponse.json({ error: "PDF storage is not configured" }, { status: 500 });
  }

  const url = await createSignedR2Url(r2Config, project.pdfKey);
  return NextResponse.json({ url });
}
