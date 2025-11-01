"use client";

import React, { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-semibold">Forgot password</h1>
      {done ? (
        <p className="mt-3 text-sm text-gray-600">If that email exists, we sent a reset link.</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            className="w-full rounded border p-2"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-60" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </main>
  );
}
