"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { submitGoogleSignIn } from "@/lib/googleSignIn";

type Step = "form" | "verify";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifyEmailParam = searchParams.get("verifyEmail");
  const selectedPlan = searchParams.get("plan");
  const selectedBilling = searchParams.get("billing");
  const selectedPlanTier = selectedPlan === "essential_plus" || selectedPlan === "signature_pro" ? selectedPlan : null;
  const selectedBillingPeriod = selectedBilling === "annual" || selectedBilling === "monthly" ? selectedBilling : null;
  const postSignupCallbackUrl = selectedPlanTier && selectedBillingPeriod
    ? "/pricing?checkout=" + selectedPlanTier + "&billing=" + selectedBillingPeriod
    : "/projects/all";
  const [step, setStep] = useState<Step>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [codeDigits, setCodeDigits] = useState<string[]>(() => Array(6).fill(""));
  const [pendingEmail, setPendingEmail] = useState("");
  const [requiredErrors, setRequiredErrors] = useState({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
  });
  const codeValue = useMemo(() => codeDigits.join(""), [codeDigits]);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(25);
  const actionBusy = busy || googleBusy;
  const hasPasswordStrengthError =
    typeof err === "string" &&
    err.startsWith("Password must be at least 8 characters");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (actionBusy) return;
    setErr(null);
    setInfo(null);

    const nextRequiredErrors = {
      firstName: firstName.trim().length === 0,
      lastName: lastName.trim().length === 0,
      email: email.trim().length === 0,
      password: password.trim().length === 0,
    };
    setRequiredErrors(nextRequiredErrors);

    if (Object.values(nextRequiredErrors).some(Boolean)) {
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
      const name = `${firstName.trim()} ${lastName.trim()}`.trim();
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
      setCodeDigits(Array(6).fill(""));
    } catch (error) {
      setErr("Sign up failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function togglePasswordVisibility() {
    setShowPassword((prev) => !prev);
  }

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

  function handleBackToForm() {
    setStep("form");
    setPassword("");
    setCodeDigits(Array(6).fill(""));
    setErr(null);
    setInfo(null);
    setBusy(false);
    setGoogleBusy(false);
    setResendBusy(false);
    setFirstName("");
    setLastName("");
    setRequiredErrors({ firstName: false, lastName: false, email: false, password: false });
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (actionBusy) return;
    setBusy(true);
    setErr(null);
    setInfo(null);

    try {
      const res = await fetch("/api/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, code: codeValue }),
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

      setInfo(selectedPlanTier ? "Email verified! Taking you to checkout..." : "Email verified! Signing you in...");
      if (password) {
        const signInResult = await signIn("credentials", {
          redirect: false,
          email: pendingEmail.trim().toLowerCase(),
          password,
          callbackUrl: postSignupCallbackUrl,
        });

        if (!signInResult?.error) {
          window.location.assign(signInResult?.url ?? postSignupCallbackUrl);
          return;
        }
      }

      router.replace("/login?callbackUrl=" + encodeURIComponent(postSignupCallbackUrl));
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

  useEffect(() => {
    if (!verifyEmailParam) return;
    setEmail(verifyEmailParam);
    setPendingEmail(verifyEmailParam);
    setStep("verify");
    setCodeDigits(Array(6).fill(""));
    setErr(null);
    setInfo(null);
  }, [verifyEmailParam]);

  return (
    <main
      data-login-page
      className="relative box-border flex min-h-[calc(100svh-46px)] w-full justify-center overflow-x-hidden bg-transparent px-0 py-0 sm:min-h-[calc(100svh-40px)] sm:py-0 md:items-center"
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
      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-46px)] w-full max-w-7xl items-center justify-center px-4 py-6 sm:min-h-[calc(100svh-40px)] sm:py-0 lg:px-6">
        {/* Create-account card centered */}
        <div className="flex w-full items-center justify-center">
          <div className="auth-card-animate h-auto w-full max-w-lg rounded-[5px] border border-white/25 bg-white px-6 py-8 shadow-[0_1px_4px_rgba(15,23,42,0.16)] sm:min-h-[620px] sm:px-9 sm:py-10 sm:shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <div className="mb-4 flex items-center">
              <Image
                src="/logos/home-expanded-sidebar-logo-light-v6.svg"
                alt="MergifyPDF"
                width={164}
                height={47}
                priority
                loading="eager"
                className="block"
                style={{ width: 164, height: 47 }}
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
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        First name
                      </label>
                      <input
                        className={`w-full rounded-md border-2 bg-white py-2.5 pl-[18px] pr-4 text-base text-slate-900 outline-none transition focus-visible:ring-0 sm:text-sm ${
                          requiredErrors.firstName
                            ? "border-rose-500 hover:border-rose-500 focus-visible:border-rose-500"
                            : "border-slate-300 hover:border-slate-400 focus-visible:border-[#6D6AF4]"
                        }`}
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          if (requiredErrors.firstName && e.target.value.trim().length > 0) {
                            setRequiredErrors((current) => ({ ...current, firstName: false }));
                          }
                        }}
                        autoComplete="given-name"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Last name
                      </label>
                      <input
                        className={`w-full rounded-md border-2 bg-white py-2.5 pl-[18px] pr-4 text-base text-slate-900 outline-none transition focus-visible:ring-0 sm:text-sm ${
                          requiredErrors.lastName
                            ? "border-rose-500 hover:border-rose-500 focus-visible:border-rose-500"
                            : "border-slate-300 hover:border-slate-400 focus-visible:border-[#6D6AF4]"
                        }`}
                        type="text"
                        placeholder="Last name"
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          if (requiredErrors.lastName && e.target.value.trim().length > 0) {
                            setRequiredErrors((current) => ({ ...current, lastName: false }));
                          }
                        }}
                        autoComplete="family-name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Email
                    </label>
                    <input
                      className={`w-full rounded-md border-2 bg-white py-2.5 pl-[18px] pr-4 text-base text-slate-900 outline-none transition focus-visible:ring-0 sm:text-sm ${
                        requiredErrors.email
                          ? "border-rose-500 hover:border-rose-500 focus-visible:border-rose-500"
                          : "border-slate-300 hover:border-slate-400 focus-visible:border-[#6D6AF4]"
                      }`}
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (requiredErrors.email && e.target.value.trim().length > 0) {
                          setRequiredErrors((current) => ({ ...current, email: false }));
                        }
                      }}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        className={`w-full rounded-md border-2 bg-white py-2.5 pl-[18px] pr-10 text-base text-slate-900 outline-none transition focus-visible:ring-0 sm:text-[15px] ${
                          requiredErrors.password
                            ? "border-rose-500 hover:border-rose-500 focus-visible:border-rose-500"
                            : hasPasswordStrengthError
                              ? "border-slate-300 hover:border-slate-400 focus-visible:border-[#6D6AF4] max-sm:border-rose-500 max-sm:hover:border-rose-500 max-sm:focus-visible:border-rose-500"
                              : "border-slate-300 hover:border-slate-400 focus-visible:border-[#6D6AF4]"
                        }`}
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (requiredErrors.password && e.target.value.trim().length > 0) {
                            setRequiredErrors((current) => ({ ...current, password: false }));
                          }
                        }}
                        minLength={8}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-3 flex h-full items-center justify-center text-slate-500 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D6AF4]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      >
                        {showPassword ? (
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 3l18 18" />
                            <path d="M9.6 9.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2" />
                            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
                          </svg>
                        ) : (
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
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
                    disabled={actionBusy}
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
                    if (actionBusy) return;
                    try {
                      setGoogleBusy(true);
                      setErr(null);
                      setInfo(null);
                      await submitGoogleSignIn({
                        callbackUrl: postSignupCallbackUrl,
                        loginHint: email.trim() ? email.trim().toLowerCase() : null,
                      });
                    } catch {
                      setGoogleBusy(false);
                      setErr("Google login failed. Please try again.");
                    }
                  }}
                  disabled={actionBusy}
                  aria-disabled={actionBusy}
                  className="flex w-full items-center justify-center gap-3 rounded-md border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:-translate-y-[1px] hover:border-slate-400 hover:shadow-md active:scale-[0.985] active:brightness-95 active:transition active:duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:opacity-60"
                >
                  <img src="/google.svg" alt="Google logo" className="h-5 w-5" />
                  <span>{googleBusy ? "Signing in with Google…" : "Continue with Google"}</span>
                  {googleBusy && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4 animate-spin text-slate-700"
                      fill="none"
                    >
                      <circle cx="12" cy="12" r="9" className="stroke-slate-400" strokeWidth="2.5" />
                      <path
                        d="M21 12a9 9 0 0 0-9-9"
                        className="stroke-current"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>
              </>
            ) : (
              <form onSubmit={onVerify} className="mt-6 space-y-4">
                <p className="text-sm text-slate-700">
                  We sent a 6-digit code to{" "}
                  <span className="font-medium">{pendingEmail}</span>. Enter it below.
                </p>
                <div className="mx-auto flex w-full max-w-[320px] items-center justify-between gap-2 sm:w-fit sm:max-w-none sm:gap-4">
                  {codeDigits.map((digit, index) => (
                    <input
                      key={`code-${index}`}
                      ref={(el) => {
                        codeRefs.current[index] = el;
                      }}
                      autoFocus={index === 0}
                      className="h-12 w-10 rounded-lg border-2 border-slate-300 bg-white text-center text-xl text-slate-900 outline-none transition focus-visible:border-[#6D6AF4] focus-visible:ring-0 hover:border-slate-400 sm:h-16 sm:w-[60px] sm:text-[1.375rem]"
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
                {err && <div className="text-sm text-red-600">{err}</div>}
                {info && <div className="text-sm text-green-600">{info}</div>}
                <button
                  className="w-full rounded-md bg-[#1F2937] py-2.5 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-[#111827] active:scale-[0.985] active:bg-[#0B1220] active:brightness-95 active:transition active:duration-100 disabled:opacity-60 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F2937]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  type="submit"
                  disabled={busy || codeValue.length !== 6}
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
