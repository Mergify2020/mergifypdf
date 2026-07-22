import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { sha256HexToBase64 } from "@/lib/secureUploadPolicy";

export type QuarantineStorage = {
  openIncoming(objectKey: string): Promise<Readable>;
  putVerifiedSource(input: {
    objectKey: string;
    filePath: string;
    byteLength: number;
    sha256Hex: string;
    uploadId: string;
  }): Promise<void>;
  headSource(objectKey: string): Promise<{
    byteLength: number;
    checksumSHA256: string | null;
    contentType: string | null;
    uploadId: string | null;
  } | null>;
  deleteIncoming(objectKey: string): Promise<void>;
  deleteSource(objectKey: string): Promise<void>;
};

function createClients(env: Record<string, string | undefined>) {
  const required = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_INCOMING_BUCKET",
    "R2_SOURCE_BUCKET",
  ] as const;
  const missing = required.filter((name) => !env[name]?.trim());
  if (env.STORAGE_MODEL_V2_ENABLED !== "true" || missing.length > 0) {
    throw new Error("Secure quarantine storage is not configured. Missing: " + missing.join(", "));
  }
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return {
    client,
    incomingBucket: env.R2_INCOMING_BUCKET!,
    sourceBucket: env.R2_SOURCE_BUCKET!,
  };
}

function isMissing(error: unknown) {
  const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
  const name = error instanceof Error ? error.name : "";
  return status === 404 || name === "NotFound" || name === "NoSuchKey";
}

export function createQuarantineStorage(
  env: Record<string, string | undefined> = process.env,
): QuarantineStorage {
  const { client, incomingBucket, sourceBucket } = createClients(env);
  return {
    async openIncoming(objectKey) {
      const result = await client.send(new GetObjectCommand({ Bucket: incomingBucket, Key: objectKey }));
      if (!result.Body) throw new Error("Quarantined object has no body.");
      return Readable.from(result.Body as AsyncIterable<Uint8Array>);
    },

    async putVerifiedSource(input) {
      await client.send(new PutObjectCommand({
        Bucket: sourceBucket,
        Key: input.objectKey,
        Body: createReadStream(input.filePath),
        ContentLength: input.byteLength,
        ContentType: "application/pdf",
        ChecksumSHA256: sha256HexToBase64(input.sha256Hex),
        Metadata: { uploadid: input.uploadId, inspected: "true" },
        CacheControl: "private, no-store",
      }));
    },

    async headSource(objectKey) {
      try {
        const result = await client.send(new HeadObjectCommand({
          Bucket: sourceBucket,
          Key: objectKey,
          ChecksumMode: "ENABLED",
        }));
        return {
          byteLength: result.ContentLength ?? -1,
          checksumSHA256: result.ChecksumSHA256 ?? null,
          contentType: result.ContentType ?? null,
          uploadId: result.Metadata?.uploadid ?? null,
        };
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
    },

    async deleteIncoming(objectKey) {
      await client.send(new DeleteObjectCommand({ Bucket: incomingBucket, Key: objectKey }));
    },

    async deleteSource(objectKey) {
      await client.send(new DeleteObjectCommand({ Bucket: sourceBucket, Key: objectKey }));
    },
  };
}
