"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
  const [resendCooldown, setResendCooldown] = useState(25);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setErr("Name, email, and password are required.");
      return;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (password.length < 8 || !hasUppercase || !hasLowercase || !hasSpecial) {
      setErr(
        "Password must be at least 8 characters and include uppercase, lowercase, and a special character."
      );
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
      setResendCooldown(25);
      setStep("verify");
      setCode("");
    } catch (error) {
      setErr("Sign up failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleBackToForm() {
    setStep("form");
    setPassword("");
    setCode("");
    setErr(null);
    setInfo(null);
    setBusy(false);
    setResendBusy(false);
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
    if (!pendingEmail || resendCooldown > 0) return;
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
      setResendCooldown(25);
    }
  }

  useEffect(() => {
    if (step !== "verify" || resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  return (
    <main
      data-login-page
      className="relative flex w-full items-center justify-center overflow-hidden bg-white px-0 py-4 sm:py-6"
      style={{
        height: "calc(100svh - 46px)",
        minHeight: "calc(100svh - 46px)",
      }}
    >
      {/* Darkened hero team background, behind card but above base color */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <Image
          src="/backgrounds/login-page-background-v5.svg"
          alt="MergifyPDF login background"
          fill
          className="object-cover object-left sm:object-center"
          priority={false}
        />
      </div>

      {/* Layout container to keep card centered */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-center px-4 lg:px-6">
        {/* Create-account card centered */}
        <div className="flex w-full justify-center">
          <div className="auth-card-animate w-full max-w-lg min-h-[620px] rounded-[5px] border border-white/25 bg-white px-7 py-12 shadow-[0_30px_90px_rgba(15,23,42,0.22)] sm:px-9 sm:py-14">
            <div className="mb-4 flex items-center">
              <Image
                src="/logos/home-expanded-sidebar-logo-light-v6.svg"
                alt="MergifyPDF"
                width={120}
                height={30}
                className="h-[47px] w-auto"
              />
            </div>

            {step === "verify" && (
              <button
                type="button"
                onClick={handleBackToForm}
                className="mb-3 inline-flex items-center text-xs font-medium text-[#1b6fd1] hover:text-[#1457a3]"
              >
                <span className="mr-1 text-base leading-none">&larr;</span>
                Go back
              </button>
            )}
            <h1 className="text-3xl font-semibold text-slate-900">Create your account</h1>
            {step === "verify" && (
              <p className="mt-2 text-sm text-slate-700">Verify your email.</p>
            )}

            {step === "form" ? (
              <>
                <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Name
                    </label>
                    <input
                      className="w-full rounded-md border-2 bg-white py-2.5 pl-[18px] pr-4 text-sm text-slate-900 outline-none transition focus-visible:border-[#6D6AF4] focus-visible:ring-0 border-slate-300 hover:border-slate-400"
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
                      className="w-full rounded-md border-2 bg-white py-2.5 pl-[18px] pr-4 text-sm text-slate-900 outline-none transition focus-visible:border-[#6D6AF4] focus-visible:ring-0 border-slate-300 hover:border-slate-400"
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
                      className="w-full rounded-md border-2 bg-white py-2.5 pl-[18px] pr-4 text-[15px] text-slate-900 outline-none transition focus-visible:border-[#6D6AF4] focus-visible:ring-0 border-slate-300 hover:border-slate-400"
                      type="password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                    />
                    <p className="mt-1 text-xs text-slate-600">
                      At least 8 characters, including uppercase, lowercase, and a special
                      character.
                    </p>
                  </div>

                  {err && <div className="text-sm text-red-600">{err}</div>}
                  {info && <div className="text-sm text-green-600">{info}</div>}

                  <button
                    className="w-full rounded-md bg-[#1F2937] py-2.5 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-[#111827] active:scale-[0.985] active:bg-[#0B1220] active:brightness-95 active:transition active:duration-100 disabled:opacity-60 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F2937]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                    type="submit"
                    disabled={busy}
                  >
                    {busy ? "Creating Account..." : "Create account"}
                  </button>
                </form>

                <div className="my-6 flex items-center gap-2 text-gray-700">
                  <div className="h-px flex-1 bg-gray-400/50" />
                  <span className="text-sm text-black/70">Or</span>
                  <div className="h-px flex-1 bg-gray-400/50" />
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
                  className="flex w-full items-center justify-center gap-3 rounded-md border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:-translate-y-[1px] hover:border-slate-400 hover:shadow-md active:scale-[0.985] active:brightness-95 active:transition active:duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:opacity-60"
                >
                  <img src="/google.svg" alt="Google logo" className="h-5 w-5" />
                  <span>Continue with Google</span>
                </button>
              </>
            ) : (
              <form onSubmit={onVerify} className="mt-6 space-y-4">
                <p className="text-sm text-slate-700">
                  We sent a 6-digit code to{" "}
                  <span className="font-medium">{pendingEmail}</span>. Enter it below.
                </p>
                <input
                  className="w-full rounded-md border-2 bg-white py-2.5 text-center text-lg tracking-[6px] text-slate-900 outline-none transition focus-visible:border-[#6D6AF4] focus-visible:ring-0 border-slate-300 hover:border-slate-400"
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
                  className="w-full rounded-md bg-[#1F2937] py-2.5 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-[#111827] active:scale-[0.985] active:bg-[#0B1220] active:brightness-95 active:transition active:duration-100 disabled:opacity-60 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F2937]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  type="submit"
                  disabled={busy || code.length !== 6}
                >
                  {busy ? "Confirming..." : "Confirm"}
                </button>
                <button
                  type="button"
                  className="w-full rounded-md border-2 border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 transition hover:-translate-y-[1px] hover:border-slate-400 hover:shadow-md active:scale-[0.985] active:brightness-95 active:transition active:duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:opacity-60"
                  onClick={handleResend}
                  disabled={resendBusy || resendCooldown > 0}
                >
                  {resendBusy
                    ? "Sending…"
                    : resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : "Resend code"}
                </button>
              </form>
            )}

            <div className="mt-4 text-center text-sm text-slate-700">
              <span>Already have an account? </span>
              <Link
                className="font-normal text-[#1b6fd1] underline underline-offset-2 hover:text-[#1457a3]"
                href="/login"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
