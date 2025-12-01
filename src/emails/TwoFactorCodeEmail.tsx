import * as React from "react";

export function TwoFactorCodeEmail({ code }: { code: string }) {
  return (
    <div
      style={{
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        lineHeight: 1.6,
        color: "#111827",
      }}
    >
      <h2 style={{ margin: "0 0 12px" }}>Confirm two-factor authentication</h2>
      <p>
        Use the 6-digit code below to finish turning on two-factor authentication for your
        MergifyPDF account:
      </p>
      <p
        style={{
          display: "inline-block",
          padding: "12px 20px",
          borderRadius: "10px",
          background: "#024d7c",
          color: "#ffffff",
          fontSize: "24px",
          letterSpacing: "6px",
          fontWeight: 600,
        }}
      >
        {code}
      </p>
      <p style={{ marginTop: "18px", color: "#4B5563" }}>
        This code expires in 10 minutes. If you didn&apos;t request it, you can safely ignore this
        email.
      </p>
    </div>
  );
}

