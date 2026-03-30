import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type R2Config = {
  client: S3Client;
  bucket: string;
};

export function getR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  const missing = [
    !accountId ? "R2_ACCOUNT_ID" : null,
    !accessKeyId ? "R2_ACCESS_KEY_ID" : null,
    !secretAccessKey ? "R2_SECRET_ACCESS_KEY" : null,
    !bucket ? "R2_BUCKET" : null,
  ].filter((key): key is string => key !== null);

  if (missing.length > 0) {
    const message = `R2 storage is not configured. Missing: ${missing.join(", ")}`;
    console.error(message, { env: process.env.NODE_ENV });
    throw new Error(message);
  }
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("R2 storage is not configured.");
  }

  return {
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    }),
    bucket,
  };
}

export async function uploadR2Object(
  config: R2Config,
  key: string,
  body: Buffer,
  contentType: string,
) {
  await config.client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function createSignedR2Url(config: R2Config, key: string, expiresIn = 60) {
  return getSignedUrl(
    config.client,
    new GetObjectCommand({ Bucket: config.bucket, Key: key }),
    { expiresIn }
  );
}

export async function createSignedR2UploadUrl(
  config: R2Config,
  key: string,
  contentType: string,
  expiresIn = 60,
) {
  return getSignedUrl(
    config.client,
    new PutObjectCommand({ Bucket: config.bucket, Key: key, ContentType: contentType }),
    { expiresIn }
  );
}

export async function deleteR2Objects(config: R2Config, keys: string[]) {
  if (keys.length === 0) return;
  await config.client.send(
    new DeleteObjectsCommand({
      Bucket: config.bucket,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
        Quiet: true,
      },
    })
  );
}

export async function getR2ObjectSize(config: R2Config, key: string) {
  const response = await config.client.send(
    new HeadObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );
  return typeof response.ContentLength === "number" ? response.ContentLength : null;
}

export async function getR2ObjectBuffer(config: R2Config, key: string) {
  const response = await config.client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );

  const body = response.Body;
  if (!body) {
    throw new Error("R2 object body is empty.");
  }

  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array | Buffer | string>) {
    if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(Buffer.from(chunk));
    }
  }

  return Buffer.concat(chunks);
}
