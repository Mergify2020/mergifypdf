// src/lib/email.tsx — REPLACE EVERYTHING
import React from "react";
import { Resend } from "resend";
import { ResetPasswordEmail } from "@/emails/ResetPasswordEmail";
import { SignupCodeEmail } from "@/emails/SignupCodeEmail";
import { SignatureRequestEmail } from "@/emails/SignatureRequestEmail";

type SendArgs = { to: string; token: string };

type ResetEmailSuccess = { ok: true; id?: string | null; fallback?: boolean };
type ResetEmailFailure = { ok: false; error: string };
export type ResetEmailResult = ResetEmailSuccess | ResetEmailFailure;

export async function sendResetEmail({ to, token }: SendArgs): Promise<ResetEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] Missing RESEND_API_KEY");
    return { ok: false, error: "Missing RESEND_API_KEY" };
  }

  const resend = new Resend(apiKey);
  const from = process.env.FROM_EMAIL || "MergifyPDF <onboarding@resend.dev>";

  // Build absolute reset URL
  let base =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  base = base.replace(/\/+$/, "");
  const url = `${base}/reset-password?token=${encodeURIComponent(token)}`;

  // --- primary: React email ---
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: "Reset your MergifyPDF password",
      react: <ResetPasswordEmail resetUrl={url} />,
    });

    if (error) {
      console.error("[email] Resend react error:", error);
      throw error;
    }
    console.log("[email] React send accepted:", { id: data?.id, to });
    return { ok: true, id: data?.id };
  } catch (err) {
    // --- fallback: raw HTML (no subject suffix) ---
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
      if (error) {
        console.error("[email] Resend html error:", error);
        return { ok: false, error: String(error) };
      }
      console.log("[email] HTML fallback accepted:", { id: data?.id, to });
      return { ok: true, id: data?.id, fallback: true };
    } catch (err2) {
      console.error("[email] sendResetEmail fatal:", err2);
      return { ok: false, error: String(err2) };
    }
  }
}

type SignupArgs = { to: string; code: string };

export async function sendSignupCodeEmail({ to, code }: SignupArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] Missing RESEND_API_KEY");
    return { ok: false, error: "Missing RESEND_API_KEY" };
  }

  const resend = new Resend(apiKey);
  const from =
    process.env.SIGNUP_FROM_EMAIL ||
    process.env.FROM_EMAIL ||
    "MergifyPDF <verify@mergifypdf.com>";

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: "Verify your MergifyPDF account",
      react: <SignupCodeEmail code={code} />,
    });

    if (error) {
      console.error("[email] Resend signup react error:", error);
      throw error;
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject: "Verify your MergifyPDF account",
        html: `
          <div style="font-family: Inter, Arial, sans-serif; line-height:1.6;">
            <h2 style="margin:0 0 12px;">Verify your MergifyPDF account</h2>
            <p>Use the 6-digit code below to finish creating your account:</p>
            <p style="display:inline-block;padding:12px 20px;border-radius:10px;background:#024d7c;color:#fff;font-size:24px;letter-spacing:6px;font-weight:600;">
              ${code}
            </p>
            <p style="margin-top:18px;color:#4B5563;">
              This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.
            </p>
          </div>
        `,
      });
      if (error) {
        console.error("[email] Resend signup html error:", error);
        return { ok: false, error: String(error) };
      }
      return { ok: true, id: data?.id, fallback: true };
    } catch (err2) {
      console.error("[email] sendSignupCodeEmail fatal:", err2);
      return { ok: false, error: String(err2) };
    }
  }
}

export type SignatureRequestEmailArgs = {
  to: string;
  senderName: string;
  documentName: string;
  reviewUrl: string;
};

export async function sendSignatureRequestEmail({
  to,
  senderName,
  documentName,
  reviewUrl,
}: SignatureRequestEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] Missing RESEND_API_KEY");
    return { ok: false, error: "Missing RESEND_API_KEY" };
  }

  const resend = new Resend(apiKey);
  const from = `Mergify Sign <sign@mergifypdf.com>`;
  const subject = "Your signature is requested — Mergify Sign";

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      react: <SignatureRequestEmail documentName={documentName} senderName={senderName} reviewUrl={reviewUrl} />,
    });

    if (error) {
      console.error("[email] Signature request email error:", error);
      return { ok: false, error: String(error) };
    }

    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("[email] sendSignatureRequestEmail fatal:", err);
    return { ok: false, error: String(err) };
  }
}
