import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<any> }
): Promise<Response | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = params ? await params : undefined;
  const rawProjectId = resolvedParams?.id;
  const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId;
  if (!projectId) {
    return NextResponse.json({ error: "Project id is required" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const image = typeof body?.image === "string" ? body.image.trim() : "";
  if (!image) {
    return NextResponse.json({ error: "Image is required" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { thumbnailUrl: image },
  });

  return NextResponse.json({ project: updated });
}
