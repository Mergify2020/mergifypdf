import { Resend } from "resend";
import { ResetPasswordEmail } from "@/emails/ResetPasswordEmail"; // ✅ FIXED: named import
import React from "react";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendResetArgs = {
  to: string;
  token: string;
};

export async function sendResetEmail({ to, token }: SendResetArgs) {
  console.log("[email] FROM_EMAIL:", process.env.FROM_EMAIL);
  console.log("[email] NEXT_PUBLIC_APP_URL:", process.env.NEXT_PUBLIC_APP_URL);
  console.log("[email] RESEND_API_KEY set?:", !!process.env.RESEND_API_KEY);

  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${base}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(
    to
  )}`;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "MergifyPDF <noreply@mergifypdf.com>",
      to,
      subject: "Reset your MergifyPDF password",
      react: <ResetPasswordEmail resetUrl={url} />, // ✅ uses your component correctly
    });

    console.log("[email] Resend send result:", { id: data?.id, error });
    if (error) return { ok: false, error: String(error) };
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    console.error("[email] exception:", err);
    return { ok: false, error: (err as Error).message };
  }
}
