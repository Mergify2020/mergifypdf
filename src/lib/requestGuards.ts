function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, "");
}

export function isSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const normalizedOrigin = normalizeOrigin(origin);

  const allowed = new Set<string>();
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;

  if (nextAuthUrl) allowed.add(normalizeOrigin(nextAuthUrl));
  if (publicAppUrl) allowed.add(normalizeOrigin(publicAppUrl));
  if (vercelUrl) allowed.add(normalizeOrigin(vercelUrl));

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? "http";
    allowed.add(`${proto}://${host}`);
  }

  return allowed.has(normalizedOrigin);
}
