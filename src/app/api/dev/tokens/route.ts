// src/app/api/dev/tokens/route.ts (NEW FILE - paste entire file)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    if (!email) return NextResponse.json({ ok: false, error: "missing ?email=" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ ok: false, error: "user-not-found" });

    const tokens = await prisma.resetToken.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({ ok: true, count: tokens.length, tokens });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message });
  }
}
