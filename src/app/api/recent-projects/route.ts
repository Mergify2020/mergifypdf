import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { Redis } from "@upstash/redis";

type RecentProjectEntry = {
  id: string;
  title: string;
  updatedAt: number;
};

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

const PROJECT_KEY_PREFIX = "mpdf:recent-projects:";

function userKey(userId: string) {
  return `${PROJECT_KEY_PREFIX}${userId}`;
}

function sanitizeProjects(input: unknown): RecentProjectEntry[] {
  if (!Array.isArray(input)) return [];
  const result: RecentProjectEntry[] = [];
  for (const item of input as any[]) {
    if (!item || typeof item !== "object") continue;
    const id = typeof item.id === "string" && item.id.trim().length > 0 ? item.id.trim() : null;
    const title = typeof item.title === "string" && item.title.trim().length > 0 ? item.title.trim() : null;
    const updatedAt =
      typeof item.updatedAt === "number" && Number.isFinite(item.updatedAt) ? item.updatedAt : Date.now();
    if (!id || !title) continue;
    result.push({ id, title, updatedAt });
  }
  return result;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!redis) {
    return NextResponse.json({ projects: [] });
  }
  try {
    const projects = await redis.get<RecentProjectEntry[]>(userKey(session.user.id));
    return NextResponse.json({ projects: Array.isArray(projects) ? projects : [] });
  } catch {
    return NextResponse.json({ projects: [] });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!redis) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const sanitized = sanitizeProjects((body as { projects?: unknown }).projects);
  try {
    await redis.set(userKey(session.user.id), sanitized);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

