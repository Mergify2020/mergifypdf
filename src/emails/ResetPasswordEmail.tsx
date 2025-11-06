import * as React from "react";

export function ResetPasswordEmail({ resetUrl }: { resetUrl: string }) {
  return (
    <div style={{ fontFamily: "Inter, Arial, sans-serif", lineHeight: 1.6 }}>
      <h2 style={{ margin: "0 0 12px" }}>Reset your MergifyPDF password</h2>
      <p>We received a request to reset your password. Click the button below:</p>
      <p>
        <a
          href={resetUrl}
          style={{
            display: "inline-block",
            padding: "10px 16px",
            borderRadius: 10,
            textDecoration: "none",
            background: "#2563eb",
            color: "#ffffff",
            fontWeight: 600,
          }}
        >
          Reset password
        </a>
      </p>
      <p>If the button doesn’t work, copy and paste this link into your browser:</p>
      <p style={{ wordBreak: "break-all", color: "#374151" }}>{resetUrl}</p>
      <hr style={{ border: 0, borderTop: "1px solid #e5e7eb", margin: "16px 0" }} />
      <p style={{ fontSize: 12, color: "#6b7280" }}>
        If you didn’t request this, you can safely ignore this email.
      </p>
    </div>
  );
}
