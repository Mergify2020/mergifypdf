import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { createSignSession, revokeOwnedSignSession, SignSessionStoreUnavailableError } from "@/lib/signSessionStore";
import { isSameOrigin } from "@/lib/requestGuards";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limit = await rateLimit(req, { keyPrefix: `sign-session:${session.user.id}`, windowMs: 60_000, max: 10 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const body = await req.json().catch(() => null) as { projectId?: unknown; replaceSessionId?: unknown } | null;
  const projectId = typeof body?.projectId === "string" && body.projectId.trim() ? body.projectId.trim() : undefined;
  const replaceSessionId = typeof body?.replaceSessionId === "string" && body.replaceSessionId.trim()
    ? body.replaceSessionId.trim()
    : undefined;

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id, trashedAt: null },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let created;
  try {
    created = await createSignSession({ ownerId: session.user.id, projectId });
  } catch (error) {
    if (error instanceof SignSessionStoreUnavailableError) {
      return NextResponse.json({ error: "Secure signing is temporarily unavailable" }, { status: 503 });
    }
    throw error;
  }
  if (replaceSessionId) {
    await revokeOwnedSignSession(replaceSessionId, session.user.id);
  }
  return NextResponse.json(
    { id: created.session.id, signingToken: created.signingToken },
    { headers: { "Cache-Control": "no-store" } },
  );
}
