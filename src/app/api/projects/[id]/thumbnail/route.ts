import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { createSignedR2Url, getR2Config } from "@/lib/r2";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    where: { id, userId, trashedAt: null },
    select: { previewKey: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const previewKey = project.previewKey;
  if (!previewKey) {
    return NextResponse.json({ error: "No thumbnail" }, { status: 404 });
  }

  let r2Config;
  try {
    r2Config = getR2Config();
  } catch {
    return NextResponse.json({ error: "Preview storage is not configured" }, { status: 500 });
  }

  const url = await createSignedR2Url(r2Config, previewKey);
  return NextResponse.redirect(url, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
