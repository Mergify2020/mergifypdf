function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, "");
}

function extractHostname(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase().trim();
  } catch {
    return value.split(":")[0]?.toLowerCase().trim() ?? null;
  }
}

export function isSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const normalizedOrigin = origin ? normalizeOrigin(origin) : null;

  const allowedOrigins = new Set<string>();
  const allowedHosts = new Set<string>();
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;

  for (const candidate of [nextAuthUrl, publicAppUrl, vercelUrl]) {
    if (!candidate) continue;
    allowedOrigins.add(normalizeOrigin(candidate));
    const hostname = extractHostname(candidate);
    if (hostname) allowedHosts.add(hostname);
  }

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const hostname = host.split(":")[0]?.toLowerCase().trim();
    if (hostname) allowedHosts.add(hostname);
    const proto = req.headers.get("x-forwarded-proto") ?? "http";
    allowedOrigins.add(`${proto}://${host}`);
    allowedOrigins.add(`http://${host}`);
    allowedOrigins.add(`https://${host}`);
  }

  if (!origin) {
    const requestHost = req.headers.get("host");
    const requestHostname = requestHost?.split(":")[0]?.toLowerCase().trim();
    return Boolean(requestHostname && allowedHosts.has(requestHostname));
  }

  if (!normalizedOrigin) return false;

  if (allowedOrigins.has(normalizedOrigin)) return true;

  try {
    const parsedOrigin = new URL(normalizedOrigin);
    const originHostname = parsedOrigin.hostname.toLowerCase().trim();
    return allowedHosts.has(originHostname) && (parsedOrigin.protocol === "https:" || parsedOrigin.protocol === "http:");
  } catch {
    return false;
  }
}
