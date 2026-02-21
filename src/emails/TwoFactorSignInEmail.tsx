import * as React from "react";

export function TwoFactorSignInEmail({ code, manageAccountUrl }: { code: string; manageAccountUrl: string }) {
  return (
    <div
      style={{
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        lineHeight: 1.6,
        color: "#111827",
      }}
    >
      <h2 style={{ margin: "0 0 12px" }}>Verify your sign-in</h2>
      <p>
        Use the 6-digit code below to confirm it&apos;s really you signing in to your MergifyPDF
        account:
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
        This code expires in 10 minutes. If you didn&apos;t try to sign in, you can safely ignore
        this email.
      </p>
      <p style={{ marginTop: "10px" }}>
        <a href={manageAccountUrl} style={{ color: "#4B5563", fontSize: "13px", textDecoration: "underline" }}>
          Manage Account
        </a>
      </p>
    </div>
  );
}
