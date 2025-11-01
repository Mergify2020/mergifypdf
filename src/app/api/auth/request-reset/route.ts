import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";
import { sendResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    // Always return 200 to avoid user enumeration
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // ✅ pass the string userId to the helper
      const token = await generateToken(user.id);

      // send email with our helper (object args)
      await sendResetEmail({ to: email, token });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Unexpected error" }, { status: 500 });
  }
}
