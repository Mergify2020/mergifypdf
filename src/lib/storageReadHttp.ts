import { NextResponse } from "next/server";
import { ProjectAssetNotFoundError } from "@/lib/storageAuthorization";
import { SecureUploadError } from "@/lib/secureUploadPolicy";
import { StorageReadSessionNotFoundError } from "@/lib/storageReadSession";

export function storageReadJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export function storageReadErrorResponse(error: unknown) {
  if (error instanceof SecureUploadError) {
    return storageReadJson({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof StorageReadSessionNotFoundError || error instanceof ProjectAssetNotFoundError) {
    return storageReadJson(
      { error: "File access session not found.", code: "STORAGE_READ_SESSION_NOT_FOUND" },
      { status: 404 },
    );
  }
  console.error("Private file read request failed.");
  return storageReadJson(
    { error: "Private file access is temporarily unavailable.", code: "STORAGE_READ_UNAVAILABLE" },
    { status: 503 },
  );
}

export function safePdfFileName(name: string) {
  const base = name
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f"\\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100) || "document";
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}
