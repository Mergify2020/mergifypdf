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

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = Boolean(redisUrl && redisToken);
const TTL_SECONDS = 60 * 60 * 24;

async function redisSet(key: string, value: string) {
  if (!useRedis) return false;
  try {
    const url = `${redisUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?EX=${TTL_SECONDS}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${redisToken}` },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function redisGet(key: string) {
  if (!useRedis) return null;
  try {
    const url = `${redisUrl}/get/${encodeURIComponent(key)}`;
    const res = await fetch(url, { cache: "no-store", headers: { Authorization: `Bearer ${redisToken}` } });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string | null };
    return data.result ?? null;
  } catch {
    return null;
  }
}

function memoryCreate(id: string) {
  const session: SignSession = { id, createdAt: Date.now(), updatedAt: Date.now() };
  memoryStore.set(id, session);
  return session;
}

export async function createSignSession() {
  const id = crypto.randomUUID();
  const session: SignSession = { id, createdAt: Date.now(), updatedAt: Date.now() };
  const stored = await redisSet(`mpdf:sign:${id}`, JSON.stringify(session));
  if (!stored) {
    memoryCreate(id);
  }
  return session;
}

export async function getSignSession(id: string) {
  const redisValue = await redisGet(`mpdf:sign:${id}`);
  if (redisValue) {
    try {
      return JSON.parse(redisValue) as SignSession;
    } catch {
      // fall through
    }
  }
  return memoryStore.get(id) ?? null;
}

export async function updateSignSession(id: string, data: { signatureDataUrl?: string; name?: string }) {
  const base: SignSession =
    (await getSignSession(id)) ??
    memoryStore.get(id) ?? {
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  const next: SignSession = { ...base, ...data, updatedAt: Date.now() };
  const stored = await redisSet(`mpdf:sign:${id}`, JSON.stringify(next));
  if (!stored) {
    memoryStore.set(id, next);
  }
  return next;
}
