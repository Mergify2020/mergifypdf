import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { isSameOrigin } from "@/lib/requestGuards";
import { rateLimit } from "@/lib/rateLimit";
import { readSmallJson } from "@/lib/smallJsonRequest";
import { secureUploadErrorResponse, secureUploadJson } from "@/lib/secureUploadHttp";
import { completeSecureUpload } from "@/lib/secureUploadService";

export async function POST(req: Request, { params }: { params: Promise<{ uploadId: string }> }) {
  if (!isSameOrigin(req)) return secureUploadJson({ error: "Invalid origin" }, { status: 403 });
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return secureUploadJson({ error: "Unauthorized" }, { status: 401 });
  const limit = await rateLimit(req, { keyPrefix: `secure-upload-complete:${userId}`, windowMs: 60_000, max: 20 });
  if (!limit.ok) return secureUploadJson({ error: "Too many upload requests" }, { status: 429 });
  try {
    const { uploadId } = await params;
    return secureUploadJson(await completeSecureUpload({ userId, uploadId, body: await readSmallJson(req) }));
  } catch (error) {
    return secureUploadErrorResponse(error);
  }
}
