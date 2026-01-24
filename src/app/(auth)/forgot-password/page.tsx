// src/app/forgot-password/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [email, setEmail] = useState("");
  const [codeDigits, setCodeDigits] = useState<string[]>(() => Array(6).fill(""));
  const [pendingEmail, setPendingEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(25);
  const [requestCooldown, setRequestCooldown] = useState(0);
  const codeValue = useMemo(() => codeDigits.join(""), [codeDigits]);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  function updateCodeDigit(index: number, nextValue: string) {
    setCodeDigits((prev) => {
      const updated = [...prev];
      updated[index] = nextValue;
      return updated;
    });
  }

  function focusCodeIndex(index: number) {
    const el = codeRefs.current[index];
    if (el) el.focus();
  }

  function focusLastTypedOrFirst() {
    const lastFilledIndex = [...codeDigits].reverse().findIndex((digit) => digit.length > 0);
    if (lastFilledIndex === -1) {
      focusCodeIndex(0);
      return;
    }
    const index = codeDigits.length - 1 - lastFilledIndex;
    focusCodeIndex(index);
  }

  function maskEmail(value: string) {
    const trimmed = value.trim();
    const atIndex = trimmed.indexOf("@");
    if (atIndex <= 0) return value;
    const local = trimmed.slice(0, atIndex);
    const domainFull = trimmed.slice(atIndex + 1);
    if (!local || !domainFull) return value;
    const domain = domainFull.split(".")[0] ?? "";
    if (!domain) return value;
    const localMasked =
      local.length <= 2
        ? `${local[0] ?? ""}•••••${local[local.length - 1] ?? ""}`
        : `${local[0]}•••••${local[local.length - 1]}`;
    const domainMasked =
      domain.length <= 2
        ? `${domain[0] ?? ""}•••••${domain[domain.length - 1] ?? ""}`
        : `${domain[0]}•••••${domain[domain.length - 1]}`;
    const suffix = domainFull.slice(domain.length);
    return `${localMasked}@${domainMasked}${suffix}`;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setIsError(false);

    try {
      const res = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      const ok = !!data?.ok;
      setIsError(!ok);
      if (ok) {
        setPendingEmail(email.trim());
        setCodeDigits(Array(6).fill(""));
        setResendCooldown(25);
        setRequestCooldown(10);
        setStep("verify");
        setMessage(null);
      } else {
        const code = typeof data?.code === "string" ? data.code : null;
        if (code === "EMAIL_NOT_FOUND") {
          setMessage("This email isn’t associated with an account.");
        } else if (code === "OAUTH_ONLY") {
          setMessage("This account uses Google Sign-In.");
        } else {
          setMessage(data?.message ?? "Request processed.");
        }
      }
    } catch {
      setMessage("We couldn\u2019t process the reset right now. Please try again.");
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (codeValue.length !== 6) {
      setIsError(true);
      setMessage("Please enter the 6-digit code.");
      return;
    }

    setBusy(true);
    setMessage(null);
    setIsError(false);

    try {
      const res = await fetch("/api/auth/password/reset-code-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, code: codeValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.token) {
        const errCode = typeof data?.code === "string" ? data.code : null;
        if (errCode === "INVALID_CODE") {
          setMessage("That code is invalid or expired. Please try again.");
        } else {
          setMessage(data?.message ?? "Unable to verify code.");
        }
        setIsError(true);
        focusLastTypedOrFirst();
        return;
      }

      router.replace(`/reset-password?token=${encodeURIComponent(data.token)}`);
    } catch {
      setIsError(true);
      setMessage("Unable to verify code right now. Please try again.");
      focusLastTypedOrFirst();
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    if (!pendingEmail || resendCooldown > 0) return;
    setResendBusy(true);
    setMessage(null);
    setIsError(false);

    try {
      const res = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setIsError(true);
        setMessage(data?.message ?? "Unable to resend code.");
        return;
      }
      setMessage("We sent a new code. Check your inbox.");
      setResendCooldown(25);
    } catch {
      setIsError(true);
      setMessage("Unable to resend code right now.");
    } finally {
      setResendBusy(false);
    }
  }

  function handleBackToForm() {
    setStep("form");
    setMessage(null);
    setIsError(false);
    setBusy(false);
    setResendBusy(false);
    setCodeDigits(Array(6).fill(""));
  }

  useEffect(() => {
    if (step !== "verify" || resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  useEffect(() => {
    if (step !== "form" || requestCooldown <= 0) return;

    const timer = setInterval(() => {
      setRequestCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step, requestCooldown]);

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
        {/* Reset-password card centered */}
        <div className="flex w-full justify-center">
          <div className="auth-card-animate w-full max-w-lg min-h-[620px] rounded-[5px] border border-white/25 bg-white px-7 py-12 shadow-[0_30px_90px_rgba(15,23,42,0.22)] sm:px-9 sm:py-14">
            <div key={step} className="auth-card-animate">
            <div className="mb-4 flex items-center justify-between">
              <Image
                src="/logos/home-expanded-sidebar-logo-light-v6.svg"
                alt="MergifyPDF"
                width={120}
                height={30}
                className="h-[47px] w-auto"
              />
              <div aria-hidden="true" />
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
            <h1 className="text-3xl font-semibold text-slate-900">
                {step === "form" ? "Forgot your password?" : "Verify your identity"}
              </h1>
            {step === "form" ? (
              <p className="mt-2 text-sm text-slate-700">
                To reset your password, enter the email associated with your account.
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-700">
                Enter the code we just sent to{" "}
                <span className="font-medium">{maskEmail(pendingEmail)}</span>
              </p>
            )}

            {step === "form" ? (
              <>
                <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Email address
                    </label>
                    <input
                      className="w-full rounded-md border-2 bg-white py-2.5 pl-[18px] pr-4 text-sm text-slate-900 outline-none transition focus-visible:border-[#6D6AF4] focus-visible:ring-0 border-slate-300 hover:border-slate-400"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {message && (
                    <div className={`text-sm ${isError ? "text-red-600" : "text-green-700"}`}>
                      {message}
                    </div>
                  )}

                  <button
                    className="w-full rounded-md bg-[#1F2937] py-2.5 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-[#111827] active:scale-[0.985] active:bg-[#0B1220] active:brightness-95 active:transition active:duration-100 disabled:opacity-60 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F2937]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                    type="submit"
                    disabled={busy || requestCooldown > 0}
                  >
                    {busy
                      ? "Sending\u2026"
                      : requestCooldown > 0
                        ? `Send reset code in ${requestCooldown}s`
                        : "Send reset code"}
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
                      await signIn("google", { callbackUrl: "/" });
                    } catch {
                      // no-op; this button is secondary to the reset flow
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
              <>
                <form onSubmit={onVerify} className="mt-6 space-y-4">
                  <div className="mx-auto flex w-fit items-center gap-4">
                    {codeDigits.map((digit, index) => (
                      <input
                        key={`code-${index}`}
                        ref={(el) => {
                          codeRefs.current[index] = el;
                        }}
                        autoFocus={index === 0}
                        className="h-16 w-[60px] rounded-lg border-2 border-slate-300 bg-white text-center text-[1.375rem] text-slate-900 outline-none transition focus-visible:border-[#6D6AF4] focus-visible:ring-0 hover:border-slate-400"
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          if (!value) {
                            updateCodeDigit(index, "");
                            return;
                          }
                          updateCodeDigit(index, value[0]);
                          if (index < 5) {
                            focusCodeIndex(index + 1);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !digit && index > 0) {
                            updateCodeDigit(index - 1, "");
                            focusCodeIndex(index - 1);
                          }
                          if (e.key === "ArrowLeft" && index > 0) {
                            focusCodeIndex(index - 1);
                          }
                          if (e.key === "ArrowRight" && index < 5) {
                            focusCodeIndex(index + 1);
                          }
                        }}
                        onPaste={(e) => {
                          const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
                          if (!pasted) return;
                          e.preventDefault();
                          const next = [...codeDigits];
                          for (let i = 0; i < 6; i += 1) {
                            const targetIndex = index + i;
                            if (targetIndex > 5) break;
                            next[targetIndex] = pasted[i] ?? "";
                          }
                          setCodeDigits(next);
                          const lastIndex = Math.min(index + pasted.length - 1, 5);
                          focusCodeIndex(Math.max(lastIndex, 0));
                        }}
                        aria-label={`Digit ${index + 1}`}
                      />
                    ))}
                  </div>

                  {message && (
                    <div className={`text-sm ${isError ? "text-red-600" : "text-green-700"}`}>
                      {message}
                    </div>
                  )}

                  <button
                    className="w-full rounded-md bg-[#1F2937] py-2.5 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-[#111827] active:scale-[0.985] active:bg-[#0B1220] active:brightness-95 active:transition active:duration-100 disabled:opacity-60 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F2937]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                    type="submit"
                    disabled={busy || codeValue.length !== 6}
                  >
                    {busy ? "Confirming\u2026" : "Confirm code"}
                  </button>

                  <button
                    type="button"
                    className="w-full rounded-md border-2 border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 transition hover:-translate-y-[1px] hover:border-slate-400 hover:shadow-md active:scale-[0.985] active:brightness-95 active:transition active:duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:opacity-60"
                    onClick={handleResend}
                    disabled={resendBusy || resendCooldown > 0}
                  >
                    {resendBusy
                      ? "Sending\u2026"
                      : resendCooldown > 0
                        ? `Resend code in ${resendCooldown}s`
                    : "Resend code"}
                  </button>
                </form>
              </>
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
      </div>
    </main>
  );
}
