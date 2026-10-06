import { Redis } from "@upstash/redis";

type SignSession = {
  id: string;
  signatureDataUrl?: string;
  name?: string;
  createdAt: number;
  updatedAt: number;
};

const globalStore = globalThis as typeof globalThis & { __mpdfSignSessions?: Map<string, SignSession> };
const memoryStore = globalStore.__mpdfSignSessions ?? new Map<string, SignSession>();
globalStore.__mpdfSignSessions = memoryStore;

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

const TTL_SECONDS = 10 * 60;

function memoryCreate(id: string) {
  const session: SignSession = { id, createdAt: Date.now(), updatedAt: Date.now() };
  memoryStore.set(id, session);
  return session;
}

function isExpired(session: SignSession) {
  return Date.now() - session.updatedAt >= TTL_SECONDS * 1000;
}

export async function createSignSession() {
  const id = crypto.randomUUID();
  const session: SignSession = { id, createdAt: Date.now(), updatedAt: Date.now() };
  try {
    if (redis) {
      await redis.set(`mpdf:sign:${id}`, session, { ex: TTL_SECONDS });
    } else {
      memoryCreate(id);
    }
  } catch {
    memoryCreate(id);
  }
  return session;
}

export async function getSignSession(id: string) {
  try {
    if (redis) {
      const value = await redis.get<SignSession>("mpdf:sign:" + id);
      if (value) return value;
    }
  } catch {
    // fall back to memory
  }

  const memorySession = memoryStore.get(id) ?? null;
  if (memorySession && isExpired(memorySession)) {
    memoryStore.delete(id);
    return null;
  }
  return memorySession;
}

export async function updateSignSession(id: string, data: { signatureDataUrl?: string; name?: string }) {
  const base = await getSignSession(id);
  if (!base) return null;

  const next: SignSession = { ...base, ...data, updatedAt: Date.now() };
  try {
    if (redis) {
      await redis.set("mpdf:sign:" + id, next, { ex: TTL_SECONDS });
    } else {
      memoryStore.set(id, next);
    }
  } catch {
    memoryStore.set(id, next);
  }
  return next;
}

export async function deleteSignSession(id: string) {
  let deleted = false;
  try {
    if (redis) {
      deleted = (await redis.del("mpdf:sign:" + id)) > 0;
    }
  } catch {
    // Clear the in-memory fallback below.
  }
  deleted = memoryStore.delete(id) || deleted;
  return deleted;
}
