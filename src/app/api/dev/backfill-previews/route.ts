import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateProjectPreview } from "@/lib/generateProjectPreview";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const projects = await prisma.project.findMany({
    where: { previewUrl: null },
    select: { id: true, pdfUrl: true },
  });

  const results: { id: string; status: "ok" | "skipped" | "error" }[] = [];

  for (const project of projects) {
    if (!project.pdfUrl) {
      results.push({ id: project.id, status: "skipped" });
      continue;
    }
    try {
      await generateProjectPreview(project.id);
      results.push({ id: project.id, status: "ok" });
    } catch {
      results.push({ id: project.id, status: "error" });
    }
  }

  return NextResponse.json({ results });
}
