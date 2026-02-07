type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  max: number;
};

type Counter = {
  count: number;
  resetAt: number;
};

const globalStore = globalThis as typeof globalThis & {
  __mpdfRateLimit?: Map<string, Counter>;
};

const store = globalStore.__mpdfRateLimit ?? new Map<string, Counter>();
globalStore.__mpdfRateLimit = store;

function getClientIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

async function rateLimitWithUpstash(key: string, options: RateLimitOptions) {
  const base = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) return null;

  const headers = { Authorization: `Bearer ${token}` };
  const encodedKey = encodeURIComponent(key);

  try {
    const incrRes = await fetch(`${base}/incr/${encodedKey}`, { headers });
    const incrJson = (await incrRes.json()) as { result?: number };
    const count = typeof incrJson.result === "number" ? incrJson.result : null;
    if (count === null) return null;

    if (count === 1) {
      await fetch(`${base}/pexpire/${encodedKey}/${options.windowMs}`, { headers });
    }

    const ttlRes = await fetch(`${base}/pttl/${encodedKey}`, { headers });
    const ttlJson = (await ttlRes.json()) as { result?: number };
    const ttl = typeof ttlJson.result === "number" ? ttlJson.result : options.windowMs;

    return {
      ok: count <= options.max,
      remaining: Math.max(0, options.max - count),
      resetAt: Date.now() + Math.max(0, ttl),
    };
  } catch {
    return null;
  }
}

export async function rateLimit(req: Request, options: RateLimitOptions) {
  const now = Date.now();
  const ip = getClientIp(req);
  const key = `${options.keyPrefix}:${ip}`;

  const upstash = await rateLimitWithUpstash(key, options);
  if (upstash) {
    return upstash;
  }

  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const next: Counter = { count: 1, resetAt: now + options.windowMs };
    store.set(key, next);
    return { ok: true, remaining: options.max - 1, resetAt: next.resetAt };
  }

  if (current.count >= options.max) {
    return { ok: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  store.set(key, current);
  return { ok: true, remaining: options.max - current.count, resetAt: current.resetAt };
}
