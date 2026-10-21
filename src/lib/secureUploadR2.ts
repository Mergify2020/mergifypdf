import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  SIGNED_UPLOAD_TTL_SECONDS,
  sha256HexToBase64,
} from "@/lib/secureUploadPolicy";

export type SignedUploadInstruction = {
  url: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
};

export type CompletedUploadPart = {
  partNumber: number;
  etag: string;
  checksumSHA256: string;
};

export type SecureUploadStorage = {
  signSingle(input: {
    objectKey: string;
    uploadId: string;
    byteLength: number;
    sha256Hex: string;
  }): Promise<SignedUploadInstruction>;
  createMultipart(input: {
    objectKey: string;
    uploadId: string;
  }): Promise<string>;
  signPart(input: {
    objectKey: string;
    multipartUploadId: string;
    partNumber: number;
    byteLength: number;
    checksumSHA256: string;
  }): Promise<SignedUploadInstruction>;
  completeMultipart(input: {
    objectKey: string;
    multipartUploadId: string;
    parts: CompletedUploadPart[];
  }): Promise<void>;
  head(objectKey: string): Promise<{
    byteLength: number;
    checksumSHA256: string | null;
    contentType: string | null;
    uploadId: string | null;
  } | null>;
  abortMultipart(objectKey: string, multipartUploadId: string): Promise<void>;
  deleteObject(objectKey: string): Promise<void>;
};

function getIncomingR2Client(env: Record<string, string | undefined> = process.env) {
  if (env.STORAGE_MODEL_V2_ENABLED !== "true") {
    throw new Error("Secure storage model v2 is disabled.");
  }
  const required = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_INCOMING_BUCKET",
  ] as const;
  const missing = required.filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    throw new Error("Secure incoming storage is not configured. Missing: " + missing.join(", "));
  }
  const accountId = env.R2_ACCOUNT_ID as string;
  return {
    bucket: env.R2_INCOMING_BUCKET as string,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY as string,
      },
    }),
  };
}

export function createR2SecureUploadStorage(
  env: Record<string, string | undefined> = process.env,
): SecureUploadStorage {
  const { client, bucket } = getIncomingR2Client(env);

  return {
    async signSingle(input) {
      const checksum = sha256HexToBase64(input.sha256Hex);
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: input.objectKey,
        ContentType: "application/pdf",
        ContentLength: input.byteLength,
        ChecksumSHA256: checksum,
        Metadata: { uploadid: input.uploadId },
        CacheControl: "private, no-store",
      });
      return {
        url: await getSignedUrl(client, command, { expiresIn: SIGNED_UPLOAD_TTL_SECONDS }),
        headers: {
          "content-type": "application/pdf",
          "x-amz-checksum-sha256": checksum,
        },
        expiresInSeconds: SIGNED_UPLOAD_TTL_SECONDS,
      };
    },

    async createMultipart(input) {
      const response = await client.send(new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: input.objectKey,
        ContentType: "application/pdf",
        ChecksumAlgorithm: "SHA256",
        Metadata: { uploadid: input.uploadId },
        CacheControl: "private, no-store",
      }));
      if (!response.UploadId) throw new Error("Multipart upload initialization failed.");
      return response.UploadId;
    },

    async signPart(input) {
      const command = new UploadPartCommand({
        Bucket: bucket,
        Key: input.objectKey,
        UploadId: input.multipartUploadId,
        PartNumber: input.partNumber,
        ContentLength: input.byteLength,
        ChecksumSHA256: input.checksumSHA256,
      });
      return {
        url: await getSignedUrl(client, command, { expiresIn: SIGNED_UPLOAD_TTL_SECONDS }),
        headers: { "x-amz-checksum-sha256": input.checksumSHA256 },
        expiresInSeconds: SIGNED_UPLOAD_TTL_SECONDS,
      };
    },

    async completeMultipart(input) {
      await client.send(new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: input.objectKey,
        UploadId: input.multipartUploadId,
        MultipartUpload: {
          Parts: input.parts.map((part) => ({
            PartNumber: part.partNumber,
            ETag: part.etag,
            ChecksumSHA256: part.checksumSHA256,
          })),
        },
      }));
    },

    async head(objectKey) {
      try {
        const result = await client.send(new HeadObjectCommand({
          Bucket: bucket,
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
        const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        const name = error instanceof Error ? error.name : "";
        if (status === 404 || name === "NotFound" || name === "NoSuchKey") return null;
        throw error;
      }
    },

    async abortMultipart(objectKey, multipartUploadId) {
      await client.send(new AbortMultipartUploadCommand({
        Bucket: bucket,
        Key: objectKey,
        UploadId: multipartUploadId,
      }));
    },

    async deleteObject(objectKey) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
    },
  };
}
