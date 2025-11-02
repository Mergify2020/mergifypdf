import React from "react"; // keep import to allow future JSX version
import { Resend } from "resend";
// NOTE: don't import the React component while we test HTML mode
// import { ResetPasswordEmail } from "@/emails/ResetPasswordEmail";

type SendArgs = { to: string; token: string };

export async function sendResetEmail({ to, token }: SendArgs) {
  if (!process.env.RESEND_API_KEY) {
    console.error("[email] Missing RESEND_API_KEY");
    return { ok: false, error: "Missing RESEND_API_KEY" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const from =
    process.env.FROM_EMAIL || "MergifyPDF <onboarding@resend.dev>";

  let base =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";

  base = base.replace(/\/+$/, "");
  const url = `${base}/reset-password?token=${encodeURIComponent(token)}`;

  try {
    // TEMP: send as simple HTML to isolate the problem
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: "Reset your MergifyPDF password (HTML test)",
      html: `
        <div style="font-family: Inter, Arial, sans-serif; line-height:1.6;">
          <h2 style="margin:0 0 12px;">Reset your MergifyPDF password</h2>
          <p>Click the button below:</p>
          <p>
            <a href="${url}"
               style="display:inline-block;padding:10px 16px;border-radius:10px;text-decoration:none;background:#2563eb;color:#fff;font-weight:600;">
              Reset password
            </a>
          </p>
          <p>If the button doesn’t work, copy this link:</p>
          <p style="word-break:break-all;color:#374151;">${url}</p>
        </div>
      `,
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { ok: false, error: String(error) };
    }

    console.log("[email] Resend accepted:", { id: data?.id, to });
    return { ok: true, id: data?.id };
  } catch (e) {
    console.error("[email] Unexpected send error:", e);
    return { ok: false, error: String(e) };
  }
}
