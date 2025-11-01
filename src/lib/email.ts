import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends a password reset email.
 * Exported name MUST be `sendResetEmail` to match your route import.
 */
export async function sendResetEmail(opts: { to: string; token: string }) {
  const baseUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://mergifypdf.com";
  const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(
    opts.token
  )}&email=${encodeURIComponent(opts.to)}`;

  try {
    const from = process.env.FROM_EMAIL || "MergifyPDF <noreply@mergifypdf.com>";
    const { data, error } = await resend.emails.send({
      from,
      to: opts.to,
      subject: "Reset your MergifyPDF password",
      html: `
        <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
          <h2>Reset your password</h2>
          <p>We received a request to reset your password.</p>
          <p>
            <a href="${resetLink}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none">
              Reset Password
            </a>
          </p>
          <p>Or copy and paste this link:</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>If you didn’t request this, you can ignore this email.</p>
        </div>
      `,
      text: `Reset your password: ${resetLink}`,
    });

    if (error) {
      return { ok: false as const, error: String(error) };
    }
    return { ok: true as const, id: data?.id ?? null };
  } catch (err: any) {
    return { ok: false as const, error: err?.message ?? "Unknown error" };
  }
}

/** Optional alias if other files call the old name */
export const sendPasswordResetEmail = sendResetEmail;
