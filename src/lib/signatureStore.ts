import { Redis } from "@upstash/redis";

export type StoredSignature = {
  id: string;
  name: string;
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  createdAt: number;
};

const globalStore = globalThis as typeof globalThis & {
  __mpdfUserSignatures?: Map<string, StoredSignature[]>;
};

const memoryStore: Map<string, StoredSignature[]> =
  globalStore.__mpdfUserSignatures ?? new Map();

globalStore.__mpdfUserSignatures = memoryStore;

const rawRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
const rawRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redisUrl = rawRedisUrl?.trim();
const redisToken = rawRedisToken?.trim();

let redis: Redis | null = null;

if (redisUrl && redisToken) {
  try {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  } catch {
    redis = null;
  }
}

const USER_SIG_KEY_PREFIX = "mpdf:user-signatures:";

function getMemory(userId: string): StoredSignature[] {
  return memoryStore.get(userId) ?? [];
}

function setMemory(userId: string, signatures: StoredSignature[]) {
  memoryStore.set(userId, signatures);
}

export async function loadUserSignatures(
  userId: string,
): Promise<StoredSignature[]> {
  const key = `${USER_SIG_KEY_PREFIX}${userId}`;
  try {
    if (redis) {
      const value = await redis.get<StoredSignature[]>(key);
      if (Array.isArray(value)) {
        return value;
      }
    }
  } catch {
    // fall back
  }
  return getMemory(userId);
}

export async function saveUserSignatures(
  userId: string,
  signatures: StoredSignature[],
): Promise<void> {
  const key = `${USER_SIG_KEY_PREFIX}${userId}`;
  setMemory(userId, signatures);
  try {
    if (redis) {
      await redis.set(key, signatures);
    }
  } catch {
    // ignore redis errors; memory already updated
  }
}

