import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";

// GET /api/dev/request-reset?email=you@example.com
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email") || "";

  const result: any = { ok: false, email, steps: [] as string[] };

  try {
    if (!email.includes("@")) {
      result.error = "bad-email";
      return NextResponse.json(result);
    }

    result.steps.push("lookup-user");
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    result.userFound = !!user;

    if (!user?.id) {
      result.ok = true;
      result.reason = "user-not-found-prod-db";
      return NextResponse.json(result);
    }

    result.steps.push("generate-token");
    const token = await generateToken(user.id);
    result.tokenLen = token.length;

    result.steps.push("create-token-row");
    await prisma.resetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    result.steps.push("send-email");
    const sendRes = await sendResetEmail({ to: user.email as string, token });
    result.sendRes = sendRes;

    result.ok = true;
    return NextResponse.json(result);
  } catch (e: any) {
    result.error = String(e?.message || e);
    return NextResponse.json(result);
  }
}
