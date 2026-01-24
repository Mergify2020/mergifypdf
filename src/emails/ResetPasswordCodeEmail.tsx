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
        backgroundColor: "#F1F5FF",
        padding: "32px 0",
        fontSize: "16px",
        color: "#111827",
      }}
    >
      <div
        style={{
          maxWidth: "560px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div style={{ height: 2, backgroundColor: "#6D6AF4" }} />
        <div style={{ padding: "30px 32px 26px" }}>
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
              fontSize: "26px",
              letterSpacing: "7px",
              fontWeight: 700,
              margin: "0 0 16px",
              color: "#111827",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
            }}
          >
            {code}
          </p>
          <p style={{ margin: "0 0 16px", color: "#475569", fontSize: "14px" }}>
            Don&apos;t share this code with anyone.
          </p>
          <p style={{ margin: "0 0 16px", color: "#374151", fontSize: "15px" }}>
            To protect your account, we recommend using a unique password and enabling two-factor
            authentication. This adds an additional layer of security to help prevent unauthorized
            access.
          </p>
          <div style={{ height: 1, backgroundColor: "#e2e8f0", margin: "18px 0" }} />
          <p style={{ margin: "0 0 6px", color: "#111827", fontWeight: 600 }}>
            Didn&apos;t request this?
          </p>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
            If you didn&apos;t try to reset your password, you can safely ignore this email.
          </p>
        </div>
        <div
          style={{
            borderTop: "1px solid #e2e8f0",
            padding: "18px 32px 24px",
            backgroundColor: "#f8fafc",
          }}
        >
          <div style={{ color: "#64748b", fontSize: "13px", marginBottom: "10px" }}>
            Manage Account
          </div>
          <div style={{ color: "#64748b", fontSize: "13px", marginBottom: "10px" }}>Support</div>
          <div style={{ color: "#64748b", fontSize: "13px", marginBottom: "10px" }}>
            Privacy Policy
          </div>
          <div style={{ color: "#64748b", fontSize: "13px", marginBottom: "12px" }}>
            Terms of Service
          </div>
          <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "12px" }}>
            To help keep your account secure, please don&apos;t forward this email.
          </div>
          <div style={{ color: "#94a3b8", fontSize: "12px" }}>
            Copyright © 2026 MergifyPDF. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
