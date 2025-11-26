import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import {
  loadUserSignatures,
  saveUserSignatures,
  type StoredSignature,
} from "@/lib/signatureStore";

type IncomingSignature = {
  id?: unknown;
  name?: unknown;
  dataUrl?: unknown;
  naturalWidth?: unknown;
  naturalHeight?: unknown;
  createdAt?: unknown;
};

function sanitizeSignatures(input: unknown): StoredSignature[] {
  if (!Array.isArray(input)) return [];
  const result: StoredSignature[] = [];
  for (const item of input as IncomingSignature[]) {
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
      });
    }
  }
  return result;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const signatures = await loadUserSignatures(session.user.id);
  return NextResponse.json({ signatures });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const sanitized = sanitizeSignatures((body as { signatures?: unknown }).signatures);
  await saveUserSignatures(session.user.id, sanitized);

  return NextResponse.json({ ok: true });
}

