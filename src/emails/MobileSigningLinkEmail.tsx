import * as React from "react";

export function MobileSigningLinkEmail({ signingUrl }: { signingUrl: string }) {
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", lineHeight: 1.6 }}>
      <table width="100%" cellPadding={0} cellSpacing={0} style={{ maxWidth: 560, margin: "0 auto" }}>
        <tbody>
          <tr>
            <td style={{ padding: "24px 0", textAlign: "left" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#5B35D5" }}>MergifyPDF</span>
            </td>
          </tr>
          <tr>
            <td style={{ padding: 28, borderRadius: 16, border: "1px solid #E5E7EB", background: "#FFFFFF" }}>
              <h1 style={{ margin: "0 0 12px", fontSize: 20, color: "#111827" }}>Sign on another device</h1>
              <p style={{ margin: "0 0 20px", fontSize: 14, color: "#4B5563" }}>
                Open this secure link on the device you want to use for your signature.
              </p>
              <p style={{ margin: "0 0 24px" }}>
                <a href={signingUrl} style={{ display: "inline-block", padding: "10px 18px", borderRadius: 8, backgroundColor: "#5B35D5", color: "#FFFFFF", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                  Open signing page
                </a>
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "#6B7280", wordBreak: "break-all" }}>
                If the button does not work, open this link: {signingUrl}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
