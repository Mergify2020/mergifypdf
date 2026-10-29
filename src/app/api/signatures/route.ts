import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import {
  loadUserSignatures,
  mutateUserSignatures,
  saveUserSignatures,
  type StoredSignature,
} from "@/lib/signatureStore";
import { isSameOrigin } from "@/lib/requestGuards";

type IncomingSignature = {
  id?: unknown;
  name?: unknown;
  dataUrl?: unknown;
  naturalWidth?: unknown;
  naturalHeight?: unknown;
  createdAt?: unknown;
  typedText?: unknown;
  typedStyleId?: unknown;
};

function sanitizeSignatures(input: unknown): StoredSignature[] {
  if (!Array.isArray(input)) return [];
  const result: StoredSignature[] = [];
  for (const item of input as IncomingSignature[]) {
    if (!item || typeof item !== "object") continue;
    const id =
      typeof item.id === "string" && item.id.trim().length > 0
        ? item.id.trim()
        : undefined;
    const name =
      typeof item.name === "string" && item.name.trim().length > 0
        ? item.name.trim()
        : undefined;
    const dataUrl =
      typeof item.dataUrl === "string" && item.dataUrl.startsWith("data:")
        ? item.dataUrl
        : undefined;
    const naturalWidth =
      typeof item.naturalWidth === "number" && item.naturalWidth > 0
        ? item.naturalWidth
        : undefined;
    const naturalHeight =
      typeof item.naturalHeight === "number" && item.naturalHeight > 0
        ? item.naturalHeight
        : undefined;
    const createdAt =
      typeof item.createdAt === "number" && Number.isFinite(item.createdAt)
        ? item.createdAt
        : Date.now();

    if (id && name && dataUrl && naturalWidth && naturalHeight) {
      result.push({
        id,
        name,
        dataUrl,
        naturalWidth,
        naturalHeight,
        createdAt,
        typedText: typeof item.typedText === "string" ? item.typedText : undefined,
        typedStyleId: typeof item.typedStyleId === "string" ? item.typedStyleId : undefined,
      });
    }
  }
  return result;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const { type, signature, id, name, autoName } = body as { type?: unknown; signature?: unknown; id?: unknown; name?: unknown; autoName?: unknown };
  const [entry] = sanitizeSignatures([signature]);
  const mutation = type === "add" && entry
    ? { type: "add" as const, signature: entry, ...(autoName === true ? { autoName: true } : {}) }
    : type === "rename" && typeof id === "string" && id.trim() && typeof name === "string" && name.trim()
      ? { type: "rename" as const, id: id.trim(), name: name.trim() }
      : type === "delete" && typeof id === "string" && id.trim()
        ? { type: "delete" as const, id: id.trim() }
        : null;
  if (!mutation) return NextResponse.json({ error: "Invalid signature change" }, { status: 400 });
  try {
    const signatures = await mutateUserSignatures(session.user.id, mutation);
    return NextResponse.json({ signatures });
  } catch {
    return NextResponse.json({ error: "Signature library could not be saved" }, { status: 503 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const signatures = await loadUserSignatures(session.user.id);
    return NextResponse.json({ signatures });
  } catch {
    return NextResponse.json(
      { error: "Signature library is temporarily unavailable" },
      { status: 503 },
    );
  }
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const sanitized = sanitizeSignatures((body as { signatures?: unknown }).signatures);
  try {
    await saveUserSignatures(session.user.id, sanitized);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Signature library could not be saved" },
      { status: 503 },
    );
  }
}
