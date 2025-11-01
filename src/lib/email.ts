import { Resend } from "resend";
import { ResetPasswordEmail } from "@/emails/ResetPasswordEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

// We’ll default to production URL if present, otherwise fall back to NEXTAUTH_URL,
// otherwise to localhost for dev.
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3000";

/**
 * Sends a password reset email using a clickable link like:
 *   https://your-site.com/reset-password?token=...&email=...
 */
export async function sendResetEmail({
  to,
  token,
}: {
  to: string;
  token: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // Build a link your reset page understands
    const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(
      token
    )}&email=${encodeURIComponent(to)}`;

    const from = process.env.FROM_EMAIL || "MergifyPDF <noreply@mergifypdf.com>";

    const { error } = await resend.emails.send({
      from,
      to,
      subject: "Reset your MergifyPDF password",
      react: ResetPasswordEmail({ resetUrl }),
    });

    if (error) return { ok: false, error: String(error) };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "unknown error" };
  }
}
