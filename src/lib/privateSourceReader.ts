import { Readable } from "node:stream";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { assertRuntimeEnvironmentSafe } from "@/lib/runtimeEnvironment";

export type PrivateSourceReadResult = {
  body: Readable;
  byteLength: number | null;
  contentRange: string | null;
};

export type PrivateSourceReader = {
  open(input: {
    objectKey: string;
    range?: string;
    signal?: AbortSignal;
  }): Promise<PrivateSourceReadResult>;
};

export function createPrivateSourceReader(
  env: Record<string, string | undefined> = process.env,
): PrivateSourceReader {
  assertRuntimeEnvironmentSafe(env);
  const required = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_SOURCE_BUCKET",
  ] as const;
  const missing = required.filter((name) => !env[name]?.trim());
  if (env.STORAGE_MODEL_V2_ENABLED !== "true" || missing.length > 0) {
    throw new Error("Private source storage is not configured. Missing: " + missing.join(", "));
  }
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });
  const bucket = env.R2_SOURCE_BUCKET!;
  return {
    async open(input) {
      const result = await client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: input.objectKey,
        Range: input.range,
      }), { abortSignal: input.signal });
      if (!result.Body) throw new Error("Private source object has no body.");
      return {
        body: Readable.from(result.Body as AsyncIterable<Uint8Array>),
        byteLength: result.ContentLength ?? null,
        contentRange: result.ContentRange ?? null,
      };
    },
  };
}
