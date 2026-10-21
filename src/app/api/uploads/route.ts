import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { isSameOrigin } from "@/lib/requestGuards";
import { rateLimit } from "@/lib/rateLimit";
import { readSmallJson } from "@/lib/smallJsonRequest";
import { secureUploadErrorResponse, secureUploadJson } from "@/lib/secureUploadHttp";
import { initiateSecureUpload } from "@/lib/secureUploadService";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return secureUploadJson({ error: "Invalid origin" }, { status: 403 });
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return secureUploadJson({ error: "Unauthorized" }, { status: 401 });
  const limit = await rateLimit(req, { keyPrefix: `secure-upload-init:${userId}`, windowMs: 60_000, max: 12 });
  if (!limit.ok) return secureUploadJson({ error: "Too many upload requests" }, { status: 429 });
  try {
    const body = await readSmallJson(req);
    return secureUploadJson(await initiateSecureUpload({
      userId,
      idempotencyKey: req.headers.get("idempotency-key"),
      body,
    }), { status: 201 });
  } catch (error) {
    return secureUploadErrorResponse(error);
  }
}
