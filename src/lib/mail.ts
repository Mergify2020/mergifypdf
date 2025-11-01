import { Resend } from "resend";

export async function sendResetEmail(to: string, url: string) {
  // In dev (or if key missing), just log and skip sending
  if (process.env.NODE_ENV !== "production" || !process.env.RESEND_API_KEY) {
    console.warn("DEV MODE: Not sending email. Reset URL:", url);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY!);
  await resend.emails.send({
    from: "MergifyPDF <no-reply@mergifypdf.com>",
    to,
    subject: "Reset your MergifyPDF password",
    html: `<p>Click to reset your password:</p>
           <p><a href="${url}">${url}</a></p>
           <p>This link expires soon. If you didn’t request it, ignore this email.</p>`,
  });
}

