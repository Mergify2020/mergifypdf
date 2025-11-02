import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";
import { createResetTokenFlexible } from "@/lib/resetTokenWriter";

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
      result.reason = "user-not-found";
      return NextResponse.json(result);
    }

    result.steps.push("generate-token");
    const token = await generateToken(user.id);
    result.tokenLen = token.length;

    result.steps.push("create-token-row");
    const createRes = await createResetTokenFlexible(user.id, user.email as string, token);
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
