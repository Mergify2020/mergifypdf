import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const to = "morrisalan2020@gmail.com";
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
