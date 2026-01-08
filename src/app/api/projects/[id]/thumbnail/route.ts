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
    select: { previewUrl: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const previewUrl = project.previewUrl;

  if (!previewUrl || typeof previewUrl !== "string") {
    return NextResponse.json({ error: "No thumbnail" }, { status: 404 });
  }

  if (previewUrl.startsWith("data:image/")) {
    const [metaHeader, base64] = previewUrl.split(",", 2);
    if (!base64) {
      return NextResponse.json({ error: "Invalid thumbnail" }, { status: 500 });
    }
    const mimeMatch = /^data:(.*?);base64$/.exec(metaHeader);
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

  return NextResponse.redirect(new URL(previewUrl, _req.url));
}
