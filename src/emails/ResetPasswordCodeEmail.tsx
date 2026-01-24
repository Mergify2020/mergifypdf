"use client";

import React from "react";

type Props = {
  code: string;
};

export function ResetPasswordCodeEmail({ code }: Props) {
  return (
    <div
      style={{
        fontFamily: "Inter, Arial, sans-serif",
        lineHeight: 1.6,
        backgroundColor: "#EEF2FF",
        padding: "28px 0",
        fontSize: "16px",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          maxWidth: "560px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 10px 28px rgba(15, 23, 42, 0.12)",
        }}
      >
        <div style={{ height: 3, backgroundColor: "#6D6AF4" }} />
        <div style={{ padding: "28px 30px 24px" }}>
          <img
            src="https://mergifypdf.com/logos/email-expanded-logo.png"
            alt="MergifyPDF"
            width={160}
            style={{ display: "block", marginBottom: "18px", height: "auto" }}
          />
          <p style={{ margin: "0 0 8px", color: "#0f172a", fontSize: "16px" }}>
            Your verification code is:
          </p>
          <p
            style={{
              fontSize: "24px",
              letterSpacing: "6px",
              fontWeight: 700,
              margin: "0 0 16px",
              color: "#111827",
            }}
          >
            {code}
          </p>
          <p style={{ margin: "0 0 14px", color: "#475569", fontSize: "14px" }}>
            Don&apos;t share this code with anyone.
          </p>
          <p style={{ margin: "0 0 14px", color: "#334155", fontSize: "15px" }}>
            To protect your account, we recommend using a unique password and enabling two-factor
            authentication. This adds an additional layer of security to help prevent unauthorized
            access.
          </p>
          <p style={{ margin: "0 0 6px", color: "#0f172a", fontWeight: 600 }}>
            Didn&apos;t request this?
          </p>
          <p style={{ margin: "0 0 14px", color: "#64748b", fontSize: "14px" }}>
            If you didn&apos;t try to reset your password, you can safely ignore this email.
          </p>
        </div>
        <div
          style={{
            borderTop: "1px solid #e2e8f0",
            padding: "18px 30px 24px",
            backgroundColor: "#f8fafc",
          }}
        >
          <div style={{ color: "#475569", fontSize: "14px", marginBottom: "12px" }}>
            <div>Manage Account</div>
            <div>Support</div>
            <div>Privacy Policy</div>
            <div>Terms of Service</div>
          </div>
          <div style={{ color: "#64748b", fontSize: "13px", marginBottom: "12px" }}>
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
