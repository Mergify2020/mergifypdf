import { NextResponse } from "next/server";

function getRequestHost(req: Request): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost ?? req.headers.get("host");
  return (host ?? "").toLowerCase().trim();
}

function isLocalHost(host: string): boolean {
  const normalized = host.split(":")[0] ?? "";
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

export function guardDevRoute(req: Request): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const configuredSecret = process.env.DEV_ROUTE_SECRET?.trim();
  if (!configuredSecret) {
    const host = getRequestHost(req);
    if (isLocalHost(host)) return null;
    return NextResponse.json(
      { error: "Forbidden: set DEV_ROUTE_SECRET to enable remote dev route access." },
      { status: 403 },
    );
  }

  const providedSecret = req.headers.get("x-dev-route-secret")?.trim();
  if (providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
