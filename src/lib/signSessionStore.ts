import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";

export type SignSessionStatus = "pending" | "submitted" | "consumed" | "revoked";
type SignSessionAuditAction = "created" | "submitted" | "consumed" | "revoked";
type SignSessionAuditEntry = { action: SignSessionAuditAction; at: number };

export type SignSession = {
  id: string;
  ownerId: string;
  projectId?: string;
  signingTokenHash: string;
  status: SignSessionStatus;
  signatureDataUrl?: string;
  name?: string;
  audit: SignSessionAuditEntry[];
  createdAt: number;
  updatedAt: number;
};

type CreatedSignSession = { session: SignSession; signingToken: string };
type MobileConsumeResult = "accepted" | "closed" | "not_found";

export class SignSessionStoreUnavailableError extends Error {
  constructor() {
    super("Secure signing sessions require Redis in production.");
  }
}

const globalStore = globalThis as typeof globalThis & {
  __mpdfSignSessions?: Map<string, SignSession>;
  __mpdfSignSessionTokens?: Map<string, string>;
};
const memoryStore = globalStore.__mpdfSignSessions ?? new Map<string, SignSession>();
const memoryTokenStore = globalStore.__mpdfSignSessionTokens ?? new Map<string, string>();
globalStore.__mpdfSignSessions = memoryStore;
globalStore.__mpdfSignSessionTokens = memoryTokenStore;

const rawRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
const rawRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redisUrl = rawRedisUrl?.trim();
const redisToken = rawRedisToken?.trim();

let redis: Redis | null = null;
if (redisUrl && redisToken) {
  try {
    redis = new Redis({ url: redisUrl, token: redisToken });
  } catch {
    redis = null;
  }
}

const TTL_SECONDS = 10 * 60;
const allowMemoryFallback = process.env.NODE_ENV !== "production";
const sessionKey = (id: string) => `mpdf:sign:${id}`;
const tokenKey = (hash: string) => `mpdf:sign:token:${hash}`;

const consumeMobileSessionScript = redis?.createScript<number>(`
  local raw = redis.call('GET', KEYS[1])
  if not raw then return 0 end
  local session = cjson.decode(raw)
  if session.status ~= 'pending' then return 1 end
  if session.signingTokenHash ~= ARGV[1] then return 2 end
  local ttl = redis.call('TTL', KEYS[1])
  if ttl <= 0 then return 0 end
  session.status = 'submitted'
  session.signatureDataUrl = ARGV[2]
  if ARGV[3] ~= '' then session.name = ARGV[3] else session.name = nil end
  session.updatedAt = tonumber(ARGV[4])
  session.audit = session.audit or {}
  table.insert(session.audit, { action = 'submitted', at = tonumber(ARGV[4]) })
  redis.call('SETEX', KEYS[1], ttl, cjson.encode(session))
  return 3
`);

function hashSigningToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

function isExpired(session: SignSession) {
  return Date.now() - session.updatedAt >= TTL_SECONDS * 1000;
}

function deleteMemorySession(id: string, tokenHash?: string) {
  const existing = memoryStore.get(id);
  memoryStore.delete(id);
  memoryTokenStore.delete(tokenHash ?? existing?.signingTokenHash ?? "");
}

function readMemorySession(id: string) {
  const session = memoryStore.get(id) ?? null;
  if (session && isExpired(session)) {
    deleteMemorySession(id, session.signingTokenHash);
    return null;
  }
  return session;
}

export async function createSignSession(input: { ownerId: string; projectId?: string }): Promise<CreatedSignSession> {
  const id = randomUUID();
  const signingToken = randomBytes(32).toString("base64url");
  const signingTokenHash = hashSigningToken(signingToken);
  const now = Date.now();
  const session: SignSession = {
    id,
    ownerId: input.ownerId,
    ...(input.projectId ? { projectId: input.projectId } : {}),
    signingTokenHash,
    status: "pending",
    audit: [{ action: "created", at: now }],
    createdAt: now,
    updatedAt: now,
  };
  try {
    if (redis) {
      await redis.set(sessionKey(id), session, { ex: TTL_SECONDS });
      await redis.set(tokenKey(signingTokenHash), id, { ex: TTL_SECONDS });
    } else {
      if (!allowMemoryFallback) throw new SignSessionStoreUnavailableError();
      memoryStore.set(id, session);
      memoryTokenStore.set(signingTokenHash, id);
    }
  } catch {
    if (!allowMemoryFallback) throw new SignSessionStoreUnavailableError();
    memoryStore.set(id, session);
    memoryTokenStore.set(signingTokenHash, id);
  }
  return { session, signingToken };
}

export async function getSignSession(id: string) {
  try {
    if (redis) {
      const value = await redis.get<SignSession>(sessionKey(id));
      if (value) return value;
    }
  } catch {
    // Use the local fallback when Redis is unavailable.
  }
  if (!allowMemoryFallback) return null;
  return readMemorySession(id);
}

export async function getOwnedSignSession(id: string, ownerId: string) {
  const session = await getSignSession(id);
  return session?.ownerId === ownerId ? session : null;
}

export async function getMobileSignSession(signingToken: string) {
  const signingTokenHash = hashSigningToken(signingToken);
  let id: string | null = null;
  try {
    if (redis) id = await redis.get<string>(tokenKey(signingTokenHash));
  } catch {
    // Use the local fallback when Redis is unavailable.
  }
  if (!allowMemoryFallback) return null;
  id ??= memoryTokenStore.get(signingTokenHash) ?? null;
  if (!id) return null;
  const session = await getSignSession(id);
  if (!session || session.signingTokenHash !== signingTokenHash) return null;
  return session;
}

export async function submitMobileSignature(input: {
  signingToken: string;
  dataUrl: string;
  name?: string;
}): Promise<MobileConsumeResult> {
  const signingTokenHash = hashSigningToken(input.signingToken);
  const session = await getMobileSignSession(input.signingToken);
  if (!session) return "not_found";
  if (session.status !== "pending") return "closed";

  if (redis && consumeMobileSessionScript) {
    try {
      const result = await consumeMobileSessionScript.eval(
        [sessionKey(session.id)],
        [signingTokenHash, input.dataUrl, input.name ?? "", String(Date.now())],
      );
      return result === 3 ? "accepted" : result === 0 ? "not_found" : "closed";
    } catch {
      // Use the in-memory fallback when Redis is unavailable.
    }
  }
  if (!allowMemoryFallback) return "not_found";

  const current = readMemorySession(session.id);
  if (!current) return "not_found";
  if (current.status !== "pending" || current.signingTokenHash !== signingTokenHash) return "closed";
  memoryStore.set(session.id, {
    ...current,
    status: "submitted",
    signatureDataUrl: input.dataUrl,
    ...(input.name ? { name: input.name } : {}),
    audit: [...(current.audit ?? []), { action: "submitted", at: Date.now() }],
    updatedAt: Date.now(),
  });
  return "accepted";
}

async function updateOwnedSession(id: string, ownerId: string, status: "consumed" | "revoked") {
  const session = await getOwnedSignSession(id, ownerId);
  if (!session) return null;
  if (status === "consumed" && session.status !== "submitted") return null;
  if (status === "revoked" && session.status !== "pending") return null;
  const now = Date.now();
  const next: SignSession = {
    ...session,
    status,
    audit: [...(session.audit ?? []), { action: status, at: now }],
    updatedAt: now,
  };
  try {
    if (redis) await redis.set(sessionKey(id), next, { ex: TTL_SECONDS });
    else {
      if (!allowMemoryFallback) return null;
      memoryStore.set(id, next);
    }
  } catch {
    if (!allowMemoryFallback) return null;
    memoryStore.set(id, next);
  }
  return next;
}

export function consumeOwnedSignSession(id: string, ownerId: string) {
  return updateOwnedSession(id, ownerId, "consumed");
}

export function revokeOwnedSignSession(id: string, ownerId: string) {
  return updateOwnedSession(id, ownerId, "revoked");
}
