import { randomBytes } from "node:crypto";

export const STORAGE_ENVIRONMENTS = ["development", "preview", "production"] as const;
export const STORAGE_BUCKET_CLASSES = ["incoming", "source", "derived"] as const;
export const STORAGE_OBJECT_KINDS = ["pdf-source", "preview", "thumbnail", "export"] as const;
export type StorageEnvironment = (typeof STORAGE_ENVIRONMENTS)[number];
export type StorageBucketClass = (typeof STORAGE_BUCKET_CLASSES)[number];
export type StorageObjectKind = (typeof STORAGE_OBJECT_KINDS)[number];

export function createPrivateObjectKey(
  input: { environment: StorageEnvironment; bucketClass: StorageBucketClass; kind: StorageObjectKind },
  entropy: () => Buffer = () => randomBytes(32),
) {
  const randomId = entropy().toString("base64url");
  if (randomId.length < 43) throw new Error("Storage object key entropy must be at least 256 bits.");
  return ["v2", input.environment, input.bucketClass, input.kind, randomId].join("/");
}

export function createStorageNamespace(entropy: () => Buffer = () => randomBytes(24)) {
  const namespace = entropy().toString("base64url");
  if (namespace.length < 32) throw new Error("Storage namespace entropy must be at least 192 bits.");
  return namespace;
}
