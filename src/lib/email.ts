import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Call like: sendResetEmail({ to: "user@x.com", token: "..." })
export async function sendResetEmail({ to, token }: { to: string; token: string }) {
  const from = process.env.FROM_EMAIL || "MergifyPDF <noreply@mergifypdf.com>";
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://mergifypdf.com";

  const link = `${base}/reset-password?token=${encodeURIComponent(token)}`;

  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Reset your MergifyPDF password",
    html: `
      <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
        <h2>Reset your password</h2>
        <p>Click the button below to reset your password:</p>
        <p><a href="${link}"
              style="display:inline-block;padding:10px 16px;border-radius:8px;background:#2563eb;color:#fff;text-decoration:none">
              Reset Password
        </a></p>
        <p>Or open this link: <br/><a href="${link}">${link}</a></p>
        <p style="color:#6b7280;font-size:12px">If you didn’t request this, you can ignore this email.</p>
      </div>
    `,
  });

  if (error) return { ok: false as const, error };
  return { ok: true as const };
}
