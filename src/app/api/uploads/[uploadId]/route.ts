import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { isSameOrigin } from "@/lib/requestGuards";
import { rateLimit } from "@/lib/rateLimit";
import { secureUploadErrorResponse, secureUploadJson } from "@/lib/secureUploadHttp";
import { cancelSecureUpload, getSecureUploadStatus } from "@/lib/secureUploadService";

type Context = { params: Promise<{ uploadId: string }> };

export async function GET(_req: Request, context: Context) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return secureUploadJson({ error: "Unauthorized" }, { status: 401 });
  try {
    const { uploadId } = await context.params;
    return secureUploadJson(await getSecureUploadStatus(userId, uploadId));
  } catch (error) {
    return secureUploadErrorResponse(error);
  }
}

export async function DELETE(req: Request, context: Context) {
  if (!isSameOrigin(req)) return secureUploadJson({ error: "Invalid origin" }, { status: 403 });
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return secureUploadJson({ error: "Unauthorized" }, { status: 401 });
  const limit = await rateLimit(req, { keyPrefix: `secure-upload-cancel:${userId}`, windowMs: 60_000, max: 20 });
  if (!limit.ok) return secureUploadJson({ error: "Too many upload requests" }, { status: 429 });
  try {
    const { uploadId } = await context.params;
    return secureUploadJson(await cancelSecureUpload(userId, uploadId));
  } catch (error) {
    return secureUploadErrorResponse(error);
  }
}
