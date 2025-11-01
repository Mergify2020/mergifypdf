"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErr(data.error || "Reset failed");
      } else {
        setOk(true);
        setTimeout(() => router.replace("/login"), 1200);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <main className="mx-auto max-w-sm p-6">
        <p className="text-sm text-red-600">Invalid or missing reset link.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          className="w-full rounded border p-2"
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {err && <div className="text-sm text-red-600">{err}</div>}
        {ok && <div className="text-sm text-green-600">Updated! Redirecting…</div>}
        <button className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-60" disabled={busy}>
          {busy ? "Saving…" : "Save password"}
        </button>
      </form>
    </main>
  );
}
