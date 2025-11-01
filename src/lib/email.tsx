// src/lib/email.tsx  (REPLACE EVERYTHING IN THIS FILE)
import { Resend } from "resend";
import { ResetPasswordEmail } from "@/emails/ResetPasswordEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendResetEmail({
  to,
  token,
}: {
  to: string;
  token: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.error("[email] Missing RESEND_API_KEY");
    return { ok: false, error: "Missing RESEND_API_KEY" };
  }

  // Build the reset URL for production
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  // Ensure we have a proper absolute URL
  const origin = base.startsWith("http") ? base : `https://${base}`;
  const url = `${origin}/reset-password?token=${encodeURIComponent(token)}`;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "MergifyPDF <noreply@mergifypdf.com>",
      to,
      subject: "Reset your MergifyPDF password",
      react: <ResetPasswordEmail resetUrl={url} />,
    });

    console.log("[email] Resend send result:", { id: data?.id, error });
    if (error) return { ok: false, error: String(error) };
    return { ok: true };
  } catch (e) {
    console.error("[email] Unexpected send error:", e);
    return { ok: false, error: "send-failed" };
  }
}
