import { NextResponse } from "next/server";
import { sendResetEmail } from "@/lib/email";
import { guardDevRoute } from "@/lib/devRouteGuard";

export async function GET(req: Request) {
  const blocked = guardDevRoute(req);
  if (blocked) return blocked;
  const to = "morrisalan2020@gmail.com";
  const code = "123456";
  const result = await sendResetEmail({ to, code });
  return NextResponse.json({ ok: true, result });
}
