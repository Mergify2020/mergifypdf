"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "form" | "verify";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setInfo(null);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(body?.error ?? "Sign up failed");
        return;
      }

      setPendingEmail(email);
      setStep("verify");
      setInfo(
        "We sent a 6-digit code to your email. Enter it below to finish signing up. If you don't see it right away, check your spam or promotions folder."
      );
      setCode("");
    } catch (error) {
      setErr("Sign up failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setInfo(null);

    try {
      const res = await fetch("/api/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, code }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body?.error === "invalid_code") {
          setErr("That code does not match. Please try again.");
        } else if (body?.error === "expired") {
          setErr("That code has expired. Request a new one.");
        } else {
          setErr(body?.error ?? "Verification failed.");
        }
        return;
      }

      setInfo("Email verified! You can sign in now.");
      setTimeout(() => router.replace("/login"), 1200);
    } catch (error) {
      setErr("Verification failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    if (!pendingEmail) return;
    setResendBusy(true);
    setErr(null);
    setInfo(null);
    try {
      const res = await fetch("/api/signup/verify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(body?.error ?? "Unable to resend code.");
        return;
      }
      setInfo("We sent a new code. Check your inbox.");
    } catch (error) {
      setErr("Unable to resend code right now.");
    } finally {
      setResendBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="text-sm text-gray-600 mt-1">Use email and a password.</p>

      {step === "form" ? (
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            className="w-full rounded border px-3 py-2"
            type="text"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded border px-3 py-2"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          {err && <div className="text-sm text-red-600">{err}</div>}
          {info && <div className="text-sm text-green-600">{info}</div>}
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
            type="submit"
            disabled={busy}
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
      ) : (
        <form onSubmit={onVerify} className="mt-6 space-y-3">
          <p className="text-sm text-gray-600">
            Enter the 6-digit code we sent to <span className="font-medium">{pendingEmail}</span>. If
            it&apos;s not in your inbox within a minute, look in your spam or promotions folder.
          </p>
          <input
            className="w-full rounded border px-3 py-2 tracking-[6px] text-center text-lg"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="______"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
          {err && <div className="text-sm text-red-600">{err}</div>}
          {info && <div className="text-sm text-green-600">{info}</div>}
          <button
            className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
            type="submit"
            disabled={busy || code.length !== 6}
          >
            {busy ? "Verifying…" : "Verify code"}
          </button>
          <button
            type="button"
            className="w-full rounded border px-4 py-2 text-sm disabled:opacity-60"
            onClick={handleResend}
            disabled={resendBusy}
          >
            {resendBusy ? "Sending…" : "Resend code"}
          </button>
        </form>
      )}

      <div className="mt-4 text-sm">
        <a className="underline" href="/login">
          Already have an account? Log in
        </a>
      </div>
    </main>
  );
}
