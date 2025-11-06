"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

// Tell Next not to prerender this page at build (avoids CSR bailout during export)
export const dynamic = "force-dynamic";

function ResetPasswordInner() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      const res = await fetch("/api/auth/password/reset-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Reset failed");
      setMsg("Password updated! You can now sign in.");
    } catch (e: any) {
      setErr(e.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      <p className="text-sm text-gray-600 mt-1">
        This link came from your email. It includes a one-time token.
      </p>

      {!token && (
        <div className="mt-4 text-sm text-red-600">
          Missing token. Please use the link from your email.
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          type="password"
          className="w-full rounded border p-2"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        {err && <div className="text-sm text-red-600">{err}</div>}
        {msg && <div className="text-sm text-green-600">{msg}</div>}
        <button
          className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-60"
          disabled={busy || !token}
        >
          {busy ? "Saving…" : "Save password"}
        </button>
      </form>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-600">Loading…</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
