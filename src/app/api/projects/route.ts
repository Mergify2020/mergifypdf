import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ projects: [] }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const pdfKey = typeof body?.pdfKey === "string" ? body.pdfKey.trim() : "";
  const thumbnailUrl = typeof body?.thumbnailUrl === "string" ? body.thumbnailUrl.trim() : undefined;

  if (!name) {
    return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  }
  const resolvedPdfKey = pdfKey || `pending-${crypto.randomUUID()}`;

  const project = await prisma.project.create({
    data: {
      name,
      pdfKey: resolvedPdfKey,
      thumbnailUrl: thumbnailUrl || null,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
