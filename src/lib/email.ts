// src/lib/email.ts
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.FROM_EMAIL;
const baseUrl = process.env.NEXTAUTH_URL;

if (!apiKey) console.error("RESEND_API_KEY is missing");
if (!from) console.error("FROM_EMAIL is missing");
if (!baseUrl) console.error("NEXTAUTH_URL is missing");

export const resend = new Resend(apiKey);

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  try {
    const result = await resend.emails.send({
      from: from!,
      to: [to],
      subject: "Reset your MergifyPDF password",
      text: `To reset your password, open: ${url}`,
      html: `
        <div style="font-family:system-ui,arial,sans-serif;max-width:520px">
          <h2>Reset your MergifyPDF password</h2>
          <p>Click the button below to choose a new password.</p>
          <p>
            <a href="${url}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#0ea5a8;color:#fff;text-decoration:none">
              Approve reset & set a new password
            </a>
          </p>
          <p style="color:#666;font-size:12px;margin-top:16px">
            If you didn’t request this, you can ignore this email.
          </p>
        </div>
      `,
      // optional but useful
      reply_to: from,
    });

    return { ok: true, id: result.data?.id ?? null };
  } catch (err: any) {
    // This will show up in Vercel → Functions → Runtime Logs
    console.error("Resend sendPasswordResetEmail error:", err?.message || err);
    return { ok: false, error: String(err?.message || err) };
  }
}
