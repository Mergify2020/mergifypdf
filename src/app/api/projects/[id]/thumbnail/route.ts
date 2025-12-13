import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const project = await prisma.project.findFirst({
    where: { id, userId },
    select: { previewUrl: true, data: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const payload = project.data as
    | {
        firstPageThumb?: string | null;
        pageThumbs?: string[];
      }
    | null;

  const dataUrl =
    (project.previewUrl &&
      typeof project.previewUrl === "string" &&
      project.previewUrl.length > 0 &&
      project.previewUrl) ||
    (payload?.firstPageThumb &&
      typeof payload.firstPageThumb === "string" &&
      payload.firstPageThumb.length > 0 &&
      payload.firstPageThumb) ||
    (Array.isArray(payload?.pageThumbs) && payload.pageThumbs[0]) ||
    null;

  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "No thumbnail" }, { status: 404 });
  }

  const [meta, base64] = dataUrl.split(",", 2);
  if (!base64) {
    return NextResponse.json({ error: "Invalid thumbnail" }, { status: 500 });
  }

  const mimeMatch = /^data:(.*?);base64$/.exec(meta);
  const mime = mimeMatch?.[1] ?? "image/png";

  const buffer = Buffer.from(base64, "base64");

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
