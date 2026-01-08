import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { generateProjectPreview } from "@/lib/generateProjectPreview";
import { promises as fs } from "fs";
import path from "path";

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

const PDF_DIR = path.join(process.cwd(), "public", "pdfs");

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
  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, userId: true, previewUrl: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (project.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing PDF file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.mkdir(PDF_DIR, { recursive: true });
  const pdfPath = path.join(PDF_DIR, `${project.id}.pdf`);
  await fs.writeFile(pdfPath, buffer);

  await prisma.project.update({
    where: { id: project.id },
    data: {
      pdfUrl: `/pdfs/${project.id}.pdf`,
    },
  });

  if (!project.previewUrl) {
    try {
      await generateProjectPreview(project.id);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Preview generation failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
