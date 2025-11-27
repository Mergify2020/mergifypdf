import * as React from "react";

export function SignatureRequestEmail({
  documentName,
  senderName,
  reviewUrl,
}: {
  documentName: string;
  senderName: string;
  reviewUrl: string;
}) {
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", lineHeight: 1.6 }}>
      <table width="100%" cellPadding={0} cellSpacing={0} style={{ maxWidth: 640, margin: "0 auto" }}>
        <tbody>
          <tr>
            <td style={{ padding: "24px 0", textAlign: "left" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#6B21A8" }}>Mergify Sign</span>
            </td>
          </tr>
          <tr>
            <td
              style={{
                padding: 24,
                borderRadius: 16,
                border: "1px solid #E5E7EB",
                background: "#FFFFFF",
                boxShadow: "0 24px 60px rgba(15,23,42,0.12)",
              }}
            >
              <h1 style={{ margin: "0 0 12px", fontSize: 20, color: "#111827" }}>
                Your signature is requested
              </h1>
              <p style={{ margin: "0 0 8px", fontSize: 14, color: "#4B5563" }}>
                <strong>{senderName}</strong> has sent you a document to review and sign:
              </p>
              <p style={{ margin: "0 0 16px", fontSize: 14, color: "#111827" }}>
                <strong>{documentName}</strong>
              </p>
              <p style={{ margin: "0 0 20px", fontSize: 14, color: "#4B5563" }}>
                To keep things secure, this link was generated for you via Mergify Sign.
              </p>
              <p style={{ margin: "0 0 24px" }}>
                <a
                  href={reviewUrl}
                  style={{
                    display: "inline-block",
                    padding: "10px 20px",
                    borderRadius: 999,
                    backgroundColor: "#7D4CDB",
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Review Document
                </a>
              </p>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "#6B7280" }}>
                If the button doesn&apos;t work, copy and paste this link into your browser:
              </p>
              <p style={{ margin: "0 0 24px", fontSize: 12, color: "#4B5563", wordBreak: "break-all" }}>
                {reviewUrl}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF" }}>
                This secure link was sent via Mergify Sign.
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

