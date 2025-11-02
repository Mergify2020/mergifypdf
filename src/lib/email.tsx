// src/lib/email.tsx  — PASTE OVER EVERYTHING
import React from "react";
import { Resend } from "resend";
import { ResetPasswordEmail } from "@/emails/ResetPasswordEmail";

type SendArgs = { to: string; token: string; mode?: "react" | "html" };

export async function sendResetEmail({ to, token, mode = "react" }: SendArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] Missing RESEND_API_KEY");
    return { ok: false, error: "Missing RESEND_API_KEY" };
  }

  const resend = new Resend(apiKey);
  const from = process.env.FROM_EMAIL || "MergifyPDF <onboarding@resend.dev>";

  let base =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  base = base.replace(/\/+$/, "");
  const url = `${base}/reset-password?token=${encodeURIComponent(token)}`;

  try {
    // Pick body based on mode
    const payload =
      mode === "react"
        ? {
            from,
            to,
            subject: "Reset your MergifyPDF password",
            // IMPORTANT: JSX must be valid, no stray comments after the tag
            react: <ResetPasswordEmail resetUrl={url} />,
          }
        : {
            from,
            to,
            subject: "Reset your MergifyPDF password",
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
          };

    const { data, error } = await resend.emails.send(payload as any);
    if (error) {
      console.error("[email] Resend error:", error);
      return { ok: false, error: String(error) };
    }
    console.log("[email] Resend accepted:", { id: data?.id, to, mode });
    return { ok: true, id: data?.id };
  } catch (e) {
    console.error("[email] sendResetEmail unexpected error:", e);
    // last-chance fallback: try the HTML version once if react mode failed
    if (mode === "react") {
      try {
        const { data, error } = await resend.emails.send({
          from,
          to,
          subject: "Reset your MergifyPDF password",
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
        if (error) return { ok: false, error: String(error) };
        return { ok: true, id: data?.id, fallback: true };
      } catch (e2) {
        return { ok: false, error: String(e2) };
      }
    }
    return { ok: false, error: String(e) };
  }
}
