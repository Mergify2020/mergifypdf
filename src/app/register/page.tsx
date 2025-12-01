"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

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
    setErr(null);
    setInfo(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setErr("Name, email, and password are required.");
      return;
    }

    setBusy(true);

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
    <main className="relative flex min-h-[calc(100vh-76px)] w-full items-center justify-center overflow-hidden bg-white px-0 py-4 sm:py-6">
      {/* Background image + overlay */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <img
          src="/Girl-picture.svg"
          alt="MergifyPDF signup background"
          className="h-full w-full object-cover object-left sm:object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/65 via-slate-950/35 to-slate-950/15" />
      </div>

      {/* Layout container similar to login page */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 lg:px-6">
        {/* Frosted-glass create-account card on the left */}
        <div className="flex w-full flex-1 justify-start">
          <div
            className="w-full max-w-md rounded-[26px] border border-white/60 bg-white/80 px-6 py-8 shadow-[0_24px_70px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:px-8 sm:py-9"
            style={{ backdropFilter: "blur(20px)" }}
          >
            <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
            <p className="mt-1 text-sm text-slate-700">Use email and a password.</p>

            {step === "form" ? (
              <>
                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Name
                    </label>
                    <input
                      className="w-full rounded-full border border-white/60 bg-white/85 px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-[#024d7c] focus-visible:ring-2 focus-visible:ring-[#024d7c]/70"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Email
                    </label>
                    <input
                      className="w-full rounded-full border border-white/60 bg-white/85 px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-[#024d7c] focus-visible:ring-2 focus-visible:ring-[#024d7c]/70"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Password
                    </label>
                    <input
                      className="w-full rounded-full border border-white/60 bg-white/85 px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-[#024d7c] focus-visible:ring-2 focus-visible:ring-[#024d7c]/70"
                      type="password"
                      placeholder="Create a password (min 8 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                    />
                  </div>

                  {err && <div className="text-sm text-red-600">{err}</div>}
                  {info && <div className="text-sm text-green-600">{info}</div>}

                  <button
                    className="w-full rounded-full bg-[#024d7c] py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#013a60] disabled:opacity-60"
                    type="submit"
                    disabled={busy}
                  >
                    {busy ? "Creating…" : "Create account"}
                  </button>
                </form>

                <div className="my-5 flex items-center gap-2 text-gray-400">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs uppercase">or</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setBusy(true);
                      await signIn("google", { callbackUrl: "/" });
                    } catch {
                      setBusy(false);
                      setErr("Google login failed. Please try again.");
                    }
                  }}
                  disabled={busy}
                  aria-disabled={busy}
                  className="flex w-full items-center justify-center gap-3 rounded-full border border-white/70 bg-white/85 px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-white disabled:opacity-60"
                >
                  <img src="/google.svg" alt="Google logo" className="h-5 w-5" />
                  <span>Log in with Google</span>
                </button>
              </>
            ) : (
              <form onSubmit={onVerify} className="mt-6 space-y-3">
                <p className="text-sm text-slate-800">
                  Enter the 6-digit code we sent to{" "}
                  <span className="font-medium">{pendingEmail}</span>. If it&apos;s not in your inbox
                  within a minute, look in your spam or promotions folder.
                </p>
                <input
                  className="w-full rounded-full border border-white/60 bg-white/85 px-4 py-2.5 text-center text-lg tracking-[6px] outline-none transition focus-visible:border-[#024d7c] focus-visible:ring-2 focus-visible:ring-[#024d7c]/70"
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
                  className="w-full rounded-full bg-[#024d7c] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  type="submit"
                  disabled={busy || code.length !== 6}
                >
                  {busy ? "Verifying…" : "Verify code"}
                </button>
                <button
                  type="button"
                  className="w-full rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm text-slate-900 disabled:opacity-60"
                  onClick={handleResend}
                  disabled={resendBusy}
                >
                  {resendBusy ? "Sending…" : "Resend code"}
                </button>
              </form>
            )}

            <div className="mt-4 text-center text-xs text-slate-800">
              <span>Already have an account? </span>
              <a
                className="font-medium text-[#024d7c] underline-offset-2 hover:text-[#013a60] hover:underline"
                href="/login"
              >
                Log in
              </a>
            </div>
          </div>
        </div>

        <div className="hidden flex-1 lg:block" />
      </div>
    </main>
  );
}
