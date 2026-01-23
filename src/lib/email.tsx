// src/lib/email.tsx — REPLACE EVERYTHING
import React from "react";
import { Resend } from "resend";
import { ResetPasswordCodeEmail } from "@/emails/ResetPasswordCodeEmail";
import { SignupCodeEmail } from "@/emails/SignupCodeEmail";
import { SignatureRequestEmail } from "@/emails/SignatureRequestEmail";
import { TwoFactorCodeEmail } from "@/emails/TwoFactorCodeEmail";
import { TwoFactorSignInEmail } from "@/emails/TwoFactorSignInEmail";

type SendArgs = { to: string; code: string };

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
      react: <ResetPasswordCodeEmail code={code} />,
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
          <div style="font-family: Inter, Arial, sans-serif; line-height:1.6;">
            <div style="height:3px;background-color:#6D6AF4;margin:0 0 16px;"></div>
            <p>Your verification code is:</p>
            <p style="font-size:24px;letter-spacing:6px;font-weight:700;margin:0 0 8px;">
              ${code}
            </p>
            <p style="margin-top:18px;color:#4B5563;">
              This code expires in 10 minutes. If you didn’t request it, you can safely ignore this email.
            </p>
          </div>
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
      react: <SignupCodeEmail code={code} />,
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
          <div style="font-family: Inter, Arial, sans-serif; line-height:1.6;">
            <h2 style="margin:0 0 12px;">Verify your MergifyPDF account</h2>
            <p>Use the 6-digit code below to finish creating your account:</p>
            <p style="display:inline-block;padding:12px 20px;border-radius:10px;background:#024d7c;color:#fff;font-size:24px;letter-spacing:6px;font-weight:600;">
              ${code}
            </p>
            <p style="margin-top:18px;color:#4B5563;">
              This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.
            </p>
          </div>
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

type TwoFactorArgs = { to: string; code: string };
type TwoFactorResult =
  | { ok: true; id?: string | null; fallback?: boolean }
  | { ok: false; error: string };

export async function sendTwoFactorSetupEmail({
  to,
  code,
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
      subject: "Confirm two-factor authentication for your MergifyPDF account",
      react: <TwoFactorCodeEmail code={code} />,
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
        subject: "Confirm two-factor authentication for your MergifyPDF account",
        html: `
          <div style="font-family: Inter, Arial, sans-serif; line-height:1.6;color:#111827;">
            <h2 style="margin:0 0 12px;">Confirm two-factor authentication</h2>
            <p>Use the 6-digit code below to finish turning on two-factor authentication for your MergifyPDF account:</p>
            <p style="display:inline-block;padding:12px 20px;border-radius:10px;background:#024d7c;color:#fff;font-size:24px;letter-spacing:6px;font-weight:600;">
              ${code}
            </p>
            <p style="margin-top:18px;color:#4B5563;">
              This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.
            </p>
          </div>
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
      subject: "Your MergifyPDF sign-in code",
      react: <TwoFactorSignInEmail code={code} />,
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
        subject: "Your MergifyPDF sign-in code",
        html: `
          <div style="font-family: Inter, Arial, sans-serif; line-height:1.6;color:#111827;">
            <h2 style="margin:0 0 12px;">Verify your sign-in</h2>
            <p>Use the 6-digit code below to confirm it's really you signing in to your MergifyPDF account:</p>
            <p style="display:inline-block;padding:12px 20px;border-radius:10px;background:#024d7c;color:#fff;font-size:24px;letter-spacing:6px;font-weight:600;">
              ${code}
            </p>
            <p style="margin-top:18px;color:#4B5563;">
              This code expires in 10 minutes. If you didn't try to sign in, you can safely ignore this email.
            </p>
          </div>
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
