import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendResetEmail(to: string, token: string) {
  const resetUrl = `https://mergifypdf.com/reset-password?token=${token}`;

  try {
    await resend.emails.send({
      from: "MergifyPDF <noreply@mergifypdf.com>",
      to,
      subject: "Reset your MergifyPDF password",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password for MergifyPDF.</p>
          <p>
            <a href="${resetUrl}" 
               style="background-color:#2563EB;color:white;padding:10px 20px;
                      border-radius:8px;text-decoration:none;">
               Reset Password
            </a>
          </p>
          <p>If you didn’t request this, you can safely ignore this email.</p>
          <p>— The MergifyPDF Team</p>
        </div>
      `,
    });

    console.log("✅ Reset email sent to:", to);
  } catch (err) {
    console.error("❌ Failed to send reset email:", err);
  }
}
