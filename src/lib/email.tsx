// src/lib/email.tsx  — REPLACE EVERYTHING
import React from "react";
import { Resend } from "resend";
import { ResetPasswordEmail } from "@/emails/ResetPasswordEmail";

type SendArgs = { to: string; token: string };

export async function sendResetEmail({ to, token }: SendArgs) {
  if (!process.env.RESEND_API_KEY) {
    console.error("[email] Missing RESEND_API_KEY");
    return { ok: false, error: "Missing RESEND_API_KEY" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Sender: prefer your domain, fall back to Resend onboarding for deliverability while testing
  const from =
    process.env.FROM_EMAIL || "MergifyPDF <onboarding@resend.dev>";

  // -------- Build absolute reset URL --------
  // Priority: NEXTAUTH_URL → NEXT_PUBLIC_APP_URL → VERCEL_URL → localhost
  let base =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";

  // strip trailing slash
  base = base.replace(/\/+$/, "");

  const url = `${base}/reset-password?token=${encodeURIComponent(token)}`;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: "Reset your MergifyPDF password",
      // Use a React element (tsx), fully typed
      react: <ResetPasswordEmail resetUrl={url} />,
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
