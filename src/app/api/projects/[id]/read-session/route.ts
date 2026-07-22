import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { isSameOrigin } from "@/lib/requestGuards";
import { rateLimit } from "@/lib/rateLimit";
import { readSmallJson } from "@/lib/smallJsonRequest";
import { storageReadErrorResponse, storageReadJson } from "@/lib/storageReadHttp";
import { createStorageReadSession } from "@/lib/storageReadSession";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return storageReadJson({ error: "Invalid origin" }, { status: 403 });
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return storageReadJson({ error: "Unauthorized" }, { status: 401 });
  const limit = await rateLimit(req, {
    keyPrefix: `storage-read-session:${userId}`,
    windowMs: 60_000,
    max: 30,
  });
  if (!limit.ok) return storageReadJson({ error: "Too many file access requests" }, { status: 429 });
  try {
    const { id: projectId } = await params;
    const result = await createStorageReadSession({
      userId,
      projectId,
      body: await readSmallJson(req),
    });
    return storageReadJson(result, { status: 201 });
  } catch (error) {
    return storageReadErrorResponse(error);
  }
}
