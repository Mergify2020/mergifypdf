import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";

// tries several common shapes for ResetToken
async function createResetRow(userId: string, email: string, token: string) {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const result: any = { ok: false, attempt: 0, tried: [] as string[] };

  // Attempt 1: data: { token, userId, expiresAt }
  try {
    result.tried.push("userId");
    const row = await (prisma as any).resetToken.create({
      data: { token, userId, expiresAt },
    });
    return { ok: true, used: "userId", rowId: row?.id };
  } catch (e) {
    result.attempt++;
    result.err1 = String((e as any)?.message || e);
  }

  // Attempt 2: data: { token, user: { connect: { id: userId } }, expiresAt }
  try {
    result.tried.push("user.connect.id");
    const row = await (prisma as any).resetToken.create({
      data: { token, user: { connect: { id: userId } }, expiresAt },
    });
    return { ok: true, used: "user.connect.id", rowId: row?.id };
  } catch (e) {
    result.attempt++;
    result.err2 = String((e as any)?.message || e);
  }

  // Attempt 3: data: { token, email, expiresAt }
  try {
    result.tried.push("email");
    const row = await (prisma as any).resetToken.create({
      data: { token, email, expiresAt },
    });
    return { ok: true, used: "email", rowId: row?.id };
  } catch (e) {
    result.attempt++;
    result.err3 = String((e as any)?.message || e);
  }

  return result;
}

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
    const createRes = await createResetRow(user.id, user.email as string, token);
    result.createRes = createRes;

    if (!createRes.ok) {
      result.error = "failed-to-create-reset-token";
      return NextResponse.json(result);
    }

    result.steps.push("send-email");
    const sendRes = await sendResetEmail({ to: user.email as string, token });
    result.sendRes = sendRes;

    result.ok = !!sendRes.ok;
    return NextResponse.json(result);
  } catch (e: any) {
    result.error = String(e?.message || e);
    return NextResponse.json(result);
  }
}
