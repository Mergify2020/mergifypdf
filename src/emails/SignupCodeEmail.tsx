"use client";

import React from "react";

type Props = {
  code: string;
};

export function SignupCodeEmail({ code }: Props) {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{
        backgroundColor: "#F7F7F9",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
        lineHeight: 1.6,
        fontSize: "16px",
        color: "#1f2937",
      }}
    >
      <tbody>
        <tr>
          <td align="center" style={{ padding: "28px 16px" }}>
            <table
              role="presentation"
              width="560"
              cellPadding={0}
              cellSpacing={0}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "2px solid #e5e7eb",
              }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: "28px 30px 24px" }}>
                    <img
                      src="https://mergifypdf.com/.well-known/email-logo-expanded-v2.png"
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
                      Enter this code to finish creating your account.
                    </p>
                    <p style={{ margin: "0 0 18px", color: "#374151", fontSize: "15px" }}>
                      This code expires in 10 minutes. Don&apos;t share it with anyone.
                    </p>
                    <div style={{ height: 1, backgroundColor: "#e5e7eb", margin: "18px 0" }} />
                    <p style={{ margin: "0 0 6px", color: "#1f2937", fontWeight: 600 }}>
                      Didn&apos;t request this?
                    </p>
                    <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
                      If you didn&apos;t try to create an account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      borderTop: "1px solid #e5e7eb",
                      padding: "16px 30px 22px",
                      backgroundColor: "#f4f5f7",
                      borderBottomLeftRadius: "8px",
                      borderBottomRightRadius: "8px",
                    }}
                  >
                    <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "8px" }}>
                      Manage Account
                    </div>
                    <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "8px" }}>
                      Support
                    </div>
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
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
