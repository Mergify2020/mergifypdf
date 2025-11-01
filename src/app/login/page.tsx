"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    setBusy(false);
    if (res?.error) {
      setErr("Invalid email or password");
      return;
    }
    router.replace("/studio");
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-sm text-gray-600 mt-1">
        Use the account you created, or reset your password below.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          className="w-full rounded border p-2"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded border p-2"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button
          className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-60"
          disabled={busy}
        >
          {busy ? "Signing in…" : "Continue"}
        </button>
      </form>

      <div className="text-xs text-gray-500 mt-3 space-y-1 text-center">
        <p>
          <a className="underline" href="/forgot-password">
            Forgot your password?
          </a>
        </p>
        <p>
          Don’t have an account?{" "}
          <a className="underline" href="/register">
            Create one
          </a>
        </p>
      </div>
    </main>
  );
}
