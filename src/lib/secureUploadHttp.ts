import { NextResponse } from "next/server";
import { SecureUploadError } from "@/lib/secureUploadPolicy";

export function secureUploadJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export function secureUploadErrorResponse(error: unknown) {
  if (error instanceof SecureUploadError) {
    return secureUploadJson(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error("Secure upload request failed.");
  return secureUploadJson(
    { error: "Secure upload is temporarily unavailable.", code: "UPLOAD_UNAVAILABLE" },
    { status: 503 },
  );
}
