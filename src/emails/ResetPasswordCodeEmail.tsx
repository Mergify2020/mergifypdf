"use client";

import React from "react";

type Props = {
  code: string;
};

export function ResetPasswordCodeEmail({ code }: Props) {
  return (
    <div style={{ fontFamily: "Inter, Arial, sans-serif", lineHeight: 1.6 }}>
      <div style={{ height: 3, backgroundColor: "#6D6AF4", margin: "0 0 16px" }} />
      <p>Your verification code is:</p>
      <p style={{ fontSize: "24px", letterSpacing: "6px", fontWeight: 700, margin: "0 0 8px" }}>
        {code}
      </p>
      <p style={{ marginTop: "18px", color: "#4B5563" }}>
        This code expires in 10 minutes. If you didn&apos;t request it, you can safely ignore this
        email.
      </p>
    </div>
  );
}
