"use client";

import React from "react";

type Props = {
  code: string;
};

export function ResetPasswordCodeEmail({ code }: Props) {
  return (
    <div
      style={{
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
        lineHeight: 1.6,
        backgroundColor: "#F7F7F9",
        padding: "28px 0",
        fontSize: "16px",
        color: "#1f2937",
      }}
    >
      <div
        style={{
          maxWidth: "560px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "none",
        }}
      >
        <div style={{ height: 1, backgroundColor: "rgba(109, 106, 244, 0.18)" }} />
        <div style={{ padding: "28px 30px 24px" }}>
          <img
            src="https://mergifypdf.com/logos/email-expanded-logo.png"
            alt="MergifyPDF"
            width={160}
            style={{ display: "block", marginBottom: "20px", height: "auto" }}
          />
          <p style={{ margin: "0 0 10px", color: "#1f2937", fontSize: "16px" }}>
            Your verification code is:
          </p>
          <p
            style={{
              fontSize: "28px",
              letterSpacing: "6px",
              fontWeight: 700,
              margin: "0 0 18px",
              color: "#111827",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
            }}
          >
            {code}
          </p>
          <p style={{ margin: "0 0 16px", color: "#4b5563", fontSize: "14px" }}>
            Don&apos;t share this code with anyone.
          </p>
          <p style={{ margin: "0 0 18px", color: "#374151", fontSize: "15px" }}>
            To protect your account, we recommend using a unique password and enabling two-factor
            authentication. This adds an additional layer of security to help prevent unauthorized
            access.
          </p>
          <div style={{ height: 1, backgroundColor: "#e5e7eb", margin: "18px 0" }} />
          <p style={{ margin: "0 0 6px", color: "#1f2937", fontWeight: 600 }}>
            Didn&apos;t request this?
          </p>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
            If you didn&apos;t try to reset your password, you can safely ignore this email.
          </p>
        </div>
        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            padding: "16px 30px 22px",
            backgroundColor: "#fafafa",
          }}
        >
          <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "8px" }}>
            Manage Account
          </div>
          <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "8px" }}>Support</div>
          <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "8px" }}>
            Privacy Policy
          </div>
          <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "10px" }}>
            Terms of Service
          </div>
          <div style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "10px" }}>
            To help keep your account secure, please don&apos;t forward this email.
          </div>
          <div style={{ color: "#9ca3af", fontSize: "12px" }}>
            Copyright © 2026 MergifyPDF. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
