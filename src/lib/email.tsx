// src/lib/email.tsx — REPLACE EVERYTHING
import React from "react";
import { Resend } from "resend";
import { ResetPasswordCodeEmail } from "@/emails/ResetPasswordCodeEmail";
import { EmailChangeCodeEmail } from "@/emails/EmailChangeCodeEmail";
import { SignupCodeEmail } from "@/emails/SignupCodeEmail";
import { SignatureRequestEmail } from "@/emails/SignatureRequestEmail";
import { TwoFactorCodeEmail } from "@/emails/TwoFactorCodeEmail";
import { TwoFactorSignInEmail } from "@/emails/TwoFactorSignInEmail";

type SendArgs = { to: string; code: string };
const EMAIL_APP_BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL
  || process.env.NEXTAUTH_URL
  || "https://mergifypdf.com"
).replace(/\/+$/, "");
const LOGIN_URL = `${EMAIL_APP_BASE_URL}/login`;

type ResetEmailSuccess = { ok: true; id?: string | null; fallback?: boolean };
type ResetEmailFailure = { ok: false; error: string };
export type ResetEmailResult = ResetEmailSuccess | ResetEmailFailure;

export async function sendResetEmail({ to, code }: SendArgs): Promise<ResetEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] Missing RESEND_API_KEY");
    return { ok: false, error: "Missing RESEND_API_KEY" };
  }

  const resend = new Resend(apiKey);
  const from = process.env.FROM_EMAIL || "MergifyPDF <onboarding@resend.dev>";

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: "Reset your MergifyPDF password",
      react: <ResetPasswordCodeEmail code={code} manageAccountUrl={LOGIN_URL} />,
    });

    if (error) {
      console.error("[email] Resend react error:", error);
      throw error;
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject: "Reset your MergifyPDF password",
        html: `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F7F7F9;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;line-height:1.6;font-size:16px;color:#1f2937;">
            <tbody>
              <tr>
                <td align="center" style="padding:28px 16px;">
                  <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:8px;border:2px solid #e5e7eb;">
                    <tbody>
                      <tr>
                        <td style="padding:28px 30px 24px;">
                          <img src="https://mergifypdf.com/.well-known/email-logo-expanded-v2.png" alt="MergifyPDF" width="160" style="display:block;margin-bottom:20px;height:auto;" />
                          <p style="margin:0 0 10px;color:#1f2937;font-size:16px;">Your verification code is:</p>
                          <p style="font-size:28px;letter-spacing:6px;font-weight:700;margin:0 0 18px;color:#111827;font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;">${code}</p>
                          <p style="margin:0 0 16px;color:#4b5563;font-size:14px;">Don’t share this code with anyone.</p>
                          <p style="margin:0 0 18px;color:#374151;font-size:15px;">
                            To protect your account, we recommend using a unique password and enabling two-factor authentication. This adds an additional layer of security to help prevent unauthorized access.
                          </p>
                          <div style="height:1px;background-color:#e5e7eb;margin:18px 0;"></div>
                          <p style="margin:0 0 6px;color:#1f2937;font-weight:600;">Didn’t request this?</p>
                          <p style="margin:0;color:#6b7280;font-size:14px;">
                            If you didn’t try to reset your password, you can safely ignore this email.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top:1px solid #e5e7eb;padding:16px 30px 22px;background-color:#f4f5f7;border-bottom-left-radius:8px;border-bottom-right-radius:8px;">
                          <a href="${LOGIN_URL}" style="display:inline-block;color:#6b7280;font-size:13px;margin-bottom:8px;text-decoration:underline;">Manage Account</a>
                          <div style="color:#6b7280;font-size:13px;margin-bottom:8px;">Support</div>
                          <div style="color:#6b7280;font-size:13px;margin-bottom:8px;">Privacy Policy</div>
                          <div style="color:#6b7280;font-size:13px;margin-bottom:10px;">Terms of Service</div>
                          <div style="color:#9ca3af;font-size:12px;margin-bottom:10px;">
                            To help keep your account secure, please don’t forward this email.
                          </div>
                          <div style="color:#9ca3af;font-size:12px;">
                            Copyright © 2026 MergifyPDF. All rights reserved.
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        `,
      });
      if (error) {
        console.error("[email] Resend html error:", error);
        return { ok: false, error: String(error) };
      }
      return { ok: true, id: data?.id, fallback: true };
    } catch (err2) {
      console.error("[email] sendResetEmail fatal:", err2);
      return { ok: false, error: String(err2) };
    }
  }
}

export async function sendEmailChangeCodeEmail({ to, code }: SendArgs): Promise<ResetEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] Missing RESEND_API_KEY");
    return { ok: false, error: "Missing RESEND_API_KEY" };
  }

  const resend = new Resend(apiKey);
  const from =
    process.env.EMAIL_CHANGE_FROM_EMAIL ||
    process.env.SUPPORT_FROM_EMAIL ||
    "MergifyPDF Support <support@mergifypdf.com>";

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: "Confirm your new MergifyPDF email",
      react: <EmailChangeCodeEmail code={code} manageAccountUrl={LOGIN_URL} />,
    });

    if (error) {
      console.error("[email] Resend email-change react error:", error);
      throw error;
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject: "Confirm your new MergifyPDF email",
        html: `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F7F7F9;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;line-height:1.6;font-size:16px;color:#1f2937;">
            <tbody>
              <tr>
                <td align="center" style="padding:28px 16px;">
                  <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:8px;border:2px solid #e5e7eb;">
                    <tbody>
                      <tr>
                        <td style="padding:28px 30px 24px;">
                          <img src="https://mergifypdf.com/.well-known/email-logo-expanded-v2.png" alt="MergifyPDF" width="160" style="display:block;margin-bottom:20px;height:auto;" />
                          <p style="margin:0 0 10px;color:#1f2937;font-size:16px;">Use this code to confirm your new email address:</p>
                          <p style="font-size:28px;letter-spacing:6px;font-weight:700;margin:0 0 18px;color:#111827;font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;">${code}</p>
                          <p style="margin:0 0 16px;color:#4b5563;font-size:14px;">This code expires in 10 minutes. Don’t share it with anyone.</p>
                          <p style="margin:0 0 18px;color:#374151;font-size:15px;">
                            To protect your account, we recommend enabling two-factor authentication. This adds an additional layer of security to help prevent unauthorized access.
                          </p>
                          <div style="height:1px;background-color:#e5e7eb;margin:18px 0;"></div>
                          <p style="margin:0 0 6px;color:#1f2937;font-weight:600;">Didn’t request this?</p>
                          <p style="margin:0;color:#6b7280;font-size:14px;">
                            If you didn’t try to change your account email, you can ignore this message.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top:1px solid #e5e7eb;padding:16px 30px 22px;background-color:#f4f5f7;border-bottom-left-radius:8px;border-bottom-right-radius:8px;">
                          <a href="${LOGIN_URL}" style="display:inline-block;color:#6b7280;font-size:13px;margin-bottom:8px;text-decoration:underline;">Manage Account</a>
                          <div style="color:#6b7280;font-size:13px;margin-bottom:8px;">Support</div>
                          <div style="color:#6b7280;font-size:13px;margin-bottom:8px;">Privacy Policy</div>
                          <div style="color:#6b7280;font-size:13px;margin-bottom:10px;">Terms of Service</div>
                          <div style="color:#9ca3af;font-size:12px;">
                            Copyright © 2026 MergifyPDF. All rights reserved.
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        `,
      });
      if (error) {
        console.error("[email] Resend email-change html error:", error);
        return { ok: false, error: String(error) };
      }
      return { ok: true, id: data?.id, fallback: true };
    } catch (err2) {
      console.error("[email] sendEmailChangeCodeEmail fatal:", err2);
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
      react: <SignupCodeEmail code={code} manageAccountUrl={LOGIN_URL} />,
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
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F7F7F9;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;line-height:1.6;font-size:16px;color:#1f2937;">
            <tbody>
              <tr>
                <td align="center" style="padding:28px 16px;">
                  <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:8px;border:2px solid #e5e7eb;">
                    <tbody>
                      <tr>
                        <td style="padding:28px 30px 24px;">
                          <img src="https://mergifypdf.com/.well-known/email-logo-expanded-v2.png" alt="MergifyPDF" width="160" style="display:block;margin-bottom:20px;height:auto;" />
                          <p style="margin:0 0 10px;color:#1f2937;font-size:16px;">Your verification code is:</p>
                          <p style="font-size:28px;letter-spacing:6px;font-weight:700;margin:0 0 18px;color:#111827;font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;">
                            ${code}
                          </p>
                          <p style="margin:0 0 16px;color:#4b5563;font-size:14px;">
                            Enter this code to finish creating your account.
                          </p>
                          <p style="margin:0 0 18px;color:#374151;font-size:15px;">
                            This code expires in 10 minutes. Don’t share it with anyone.
                          </p>
                          <div style="height:1px;background-color:#e5e7eb;margin:18px 0;"></div>
                          <p style="margin:0 0 6px;color:#1f2937;font-weight:600;">Didn’t request this?</p>
                          <p style="margin:0;color:#6b7280;font-size:14px;">
                            If you didn’t try to create an account, you can safely ignore this email.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top:1px solid #e5e7eb;padding:16px 30px 22px;background-color:#f4f5f7;border-bottom-left-radius:8px;border-bottom-right-radius:8px;">
                          <a href="${LOGIN_URL}" style="display:inline-block;color:#6b7280;font-size:13px;margin-bottom:8px;text-decoration:underline;">Manage Account</a>
                          <div style="color:#6b7280;font-size:13px;margin-bottom:8px;">Support</div>
                          <div style="color:#6b7280;font-size:13px;margin-bottom:8px;">Privacy Policy</div>
                          <div style="color:#6b7280;font-size:13px;margin-bottom:10px;">Terms of Service</div>
                          <div style="color:#9ca3af;font-size:12px;margin-bottom:10px;">
                            To help keep your account secure, please don’t forward this email.
                          </div>
                          <div style="color:#9ca3af;font-size:12px;">
                            Copyright © 2026 MergifyPDF. All rights reserved.
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
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
      react: (
        <SignatureRequestEmail
          documentName={documentName}
          senderName={senderName}
          reviewUrl={reviewUrl}
        />
      ),
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

type TwoFactorVariant = "enable" | "disable";
type TwoFactorArgs = { to: string; code: string; variant?: TwoFactorVariant };
type TwoFactorResult =
  | { ok: true; id?: string | null; fallback?: boolean }
  | { ok: false; error: string };

export async function sendTwoFactorSetupEmail({
  to,
  code,
  variant = "enable",
}: TwoFactorArgs): Promise<TwoFactorResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] Missing RESEND_API_KEY");
    return { ok: false, error: "Missing RESEND_API_KEY" };
  }

  const resend = new Resend(apiKey);
  const from =
    process.env.SECURITY_FROM_EMAIL ||
    process.env.FROM_EMAIL ||
    "MergifyPDF <security@mergifypdf.com>";

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject:
        variant === "disable"
          ? "Disable 2FA for your MergifyPDF account"
          : "Enable 2FA for your MergifyPDF account",
      react: <TwoFactorCodeEmail code={code} manageAccountUrl={LOGIN_URL} variant={variant} />,
    });

    if (error) {
      console.error("[email] Resend 2FA react error:", error);
      throw error;
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject:
          variant === "disable"
            ? "Disable 2FA for your MergifyPDF account"
            : "Enable 2FA for your MergifyPDF account",
        html: `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F7F7F9;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;line-height:1.6;font-size:16px;color:#1f2937;">
            <tbody>
              <tr>
                <td align="center" style="padding:28px 16px;">
                  <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:8px;border:2px solid #e5e7eb;">
                    <tbody>
                      <tr>
                        <td style="padding:28px 30px 24px;">
                          <img src="https://mergifypdf.com/.well-known/email-logo-expanded-v2.png" alt="MergifyPDF" width="160" style="display:block;margin-bottom:20px;height:auto;" />
                          <p style="margin:0 0 10px;color:#1f2937;font-size:16px;">${variant === "disable" ? "Use this code to disable 2FA:" : "Use this code to enable 2FA:"}</p>
                          <p style="font-size:28px;letter-spacing:6px;font-weight:700;margin:0 0 18px;color:#111827;font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;">${code}</p>
                          <p style="margin:0 0 16px;color:#4b5563;font-size:14px;">This code expires in 10 minutes. Don’t share it with anyone.</p>
                          <div style="height:1px;background-color:#e5e7eb;margin:18px 0 14px;"></div>
                          <p style="margin:0 0 6px;color:#1f2937;font-weight:600;">How it works</p>
                          <p style="margin:0 0 18px;color:#374151;font-size:15px;">
                            ${variant === "disable" ? "After you disable 2FA, you’ll sign in with your password only." : "After you enable 2FA, we’ll email you a 6-digit code each time you sign in."}
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top:1px solid #e5e7eb;padding:14px 30px 18px;background-color:#f4f5f7;border-bottom-left-radius:8px;border-bottom-right-radius:8px;">
                          <div style="color:#6b7280;font-size:13px;line-height:1.5;">
                            <a href="${LOGIN_URL}" style="color:#6b7280;text-decoration:underline;">Manage Account</a>
                            &nbsp;·&nbsp;
                            <a href="${LOGIN_URL}?tab=support" style="color:#6b7280;text-decoration:underline;">Support</a>
                            &nbsp;·&nbsp;
                            <a href="${LOGIN_URL}?tab=security" style="color:#6b7280;text-decoration:underline;">Privacy Policy</a>
                            &nbsp;·&nbsp;
                            <a href="${LOGIN_URL}?tab=security" style="color:#6b7280;text-decoration:underline;">Terms of Service</a>
                          </div>
                          <div style="margin-top:6px;color:#9ca3af;font-size:12px;">Copyright © 2026 MergifyPDF. All rights reserved.</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        `,
      });
      if (error) {
        console.error("[email] Resend 2FA html error:", error);
        return { ok: false, error: String(error) };
      }
      return { ok: true, id: data?.id, fallback: true };
    } catch (err2) {
      console.error("[email] sendTwoFactorSetupEmail fatal:", err2);
      return { ok: false, error: String(err2) };
    }
  }
}

type TwoFactorLoginArgs = { to: string; code: string };
type TwoFactorLoginResult =
  | { ok: true; id?: string | null; fallback?: boolean }
  | { ok: false; error: string };

export async function sendTwoFactorLoginEmail({
  to,
  code,
}: TwoFactorLoginArgs): Promise<TwoFactorLoginResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] Missing RESEND_API_KEY");
    return { ok: false, error: "Missing RESEND_API_KEY" };
  }

  const resend = new Resend(apiKey);
  const from =
    process.env.SECURITY_FROM_EMAIL ||
    process.env.FROM_EMAIL ||
    "MergifyPDF <security@mergifypdf.com>";

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: "Verify your MergifyPDF sign-in",
      react: <TwoFactorSignInEmail code={code} manageAccountUrl={LOGIN_URL} />,
    });

    if (error) {
      console.error("[email] Resend 2FA login react error:", error);
      throw error;
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject: "Verify your MergifyPDF sign-in",
        html: `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F7F7F9;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;line-height:1.6;font-size:16px;color:#1f2937;">
            <tbody>
              <tr>
                <td align="center" style="padding:28px 16px;">
                  <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:8px;border:2px solid #e5e7eb;">
                    <tbody>
                      <tr>
                        <td style="padding:28px 30px 24px;">
                          <img src="https://mergifypdf.com/.well-known/email-logo-expanded-v2.png" alt="MergifyPDF" width="160" style="display:block;margin-bottom:20px;height:auto;" />
                          <p style="margin:0 0 10px;color:#1f2937;font-size:16px;">Use this code to verify your sign-in:</p>
                          <p style="font-size:28px;letter-spacing:6px;font-weight:700;margin:0 0 18px;color:#111827;font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;">${code}</p>
                          <p style="margin:0 0 16px;color:#4b5563;font-size:14px;">This code expires in 10 minutes. Don’t share it with anyone.</p>
                          <div style="height:1px;background-color:#e5e7eb;margin:18px 0 14px;"></div>
                          <p style="margin:0 0 6px;color:#1f2937;font-weight:600;">Need to change 2FA?</p>
                          <p style="margin:0 0 18px;color:#374151;font-size:15px;">You can disable 2FA anytime in Security settings.</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top:1px solid #e5e7eb;padding:14px 30px 18px;background-color:#f4f5f7;border-bottom-left-radius:8px;border-bottom-right-radius:8px;">
                          <div style="color:#6b7280;font-size:13px;line-height:1.5;">
                            <a href="${LOGIN_URL}" style="color:#6b7280;text-decoration:underline;">Manage Account</a>
                            &nbsp;&nbsp;·&nbsp;&nbsp;
                            <a href="${LOGIN_URL}?tab=support" style="color:#6b7280;text-decoration:underline;">Support</a>
                            &nbsp;&nbsp;·&nbsp;&nbsp;
                            <a href="${LOGIN_URL}?tab=security" style="color:#6b7280;text-decoration:underline;">Privacy Policy</a>
                            &nbsp;&nbsp;·&nbsp;&nbsp;
                            <a href="${LOGIN_URL}?tab=security" style="color:#6b7280;text-decoration:underline;">Terms of Service</a>
                          </div>
                          <div style="margin-top:6px;color:#9ca3af;font-size:12px;">Copyright © 2026 MergifyPDF. All rights reserved.</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        `,
      });
      if (error) {
        console.error("[email] Resend 2FA login html error:", error);
        return { ok: false, error: String(error) };
      }
      return { ok: true, id: data?.id, fallback: true };
    } catch (err2) {
      console.error("[email] sendTwoFactorLoginEmail fatal:", err2);
      return { ok: false, error: String(err2) };
    }
  }
}
