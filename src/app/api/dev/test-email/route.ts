import { NextResponse } from "next/server";
import { Resend } from "resend";
import { guardDevRoute } from "@/lib/devRouteGuard";
import { emailDeliveryAllowed } from "@/lib/runtimeEnvironment";

export async function GET(req: Request) {
  const blocked = guardDevRoute(req);
  if (blocked) return blocked;
  if (!emailDeliveryAllowed()) {
    return NextResponse.json(
      { ok: false, error: "Email delivery is disabled for this environment." },
      { status: 503 },
    );
  }
  const to = new URL(req.url).searchParams.get("to");
  if (!to) {
    return NextResponse.json({ ok: false, error: "Missing ?to=" }, { status: 400 });
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.FROM_EMAIL || "MergifyPDF <noreply@mergifypdf.com>";
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: "MergifyPDF test email",
      text: "If you received this, production can send email. 👍",
    });
    return NextResponse.json({ ok: !error, data, error });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
