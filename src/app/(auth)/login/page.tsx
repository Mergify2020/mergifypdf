// src/app/login/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid email or password.",
  EMAIL_NOT_VERIFIED: "No account found with that email.",
  OAUTH_ONLY: "This account now uses Google login. Continue with Google instead.",
  AUTH_DB_UNAVAILABLE: "Sign-in is temporarily unavailable. Please try again in a moment.",
  SERVICE_UNAVAILABLE: "Sign-in is temporarily unavailable while the app verifies its database configuration.",
  OAuthSignin: "Google login failed. Please try again.",
  OAuthCallback: "Google login failed. Please try again.",
  OAuthAccountNotLinked: "This email is already linked to a different login method.",
  AccessDenied: "Access denied. Try a different account.",
  Configuration: "Sign-in is temporarily unavailable. Please try again later.",
  Verification: "Verification link expired. Request a new one.",
};

function getAuthError(code?: string | null) {
  if (!code) return null;
  return AUTH_ERROR_MESSAGES[code] ?? "Unable to log in. Please try again.";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryError = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/projects/all";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(() => getAuthError(queryError));
  const [credentialBusy, setCredentialBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: false, password: false });
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const actionBusy = credentialBusy || googleBusy;

  useEffect(() => {
    if (!queryError) return;
    router.replace("/login", { scroll: false });
  }, [queryError, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (actionBusy) return;
    setCredentialBusy(true);
    setErr(null);

    const normalizedEmail = email.trim().toLowerCase();
    const emailEmpty = normalizedEmail.length === 0;
    const passwordEmpty = password.trim().length === 0;

    if (emailEmpty || passwordEmpty) {
      setFieldErrors({ email: emailEmpty, password: passwordEmpty });
      setCredentialBusy(false);
      return;
    }

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: normalizedEmail,
        password,
        callbackUrl,
      });

      if (res?.error) {
        setErr(getAuthError(res.error));
        setCredentialBusy(false);
        return;
      }

      if (res?.url) {
        const session = await getSession();
        if (session?.user?.twoFactorEnabled && session.user.twoFactorPassed !== true) {
          router.replace(`/2fa?callbackUrl=${encodeURIComponent(callbackUrl)}`);
          return;
        }
        window.location.assign(res.url);
        return;
      }

      const session = await getSession();
      if (session?.user?.twoFactorEnabled && session.user.twoFactorPassed !== true) {
        router.replace(`/2fa?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }
      window.location.assign(callbackUrl);
    } catch (error) {
      console.error(error);
      setErr("Unable to log in. Please try again.");
      setCredentialBusy(false);
    }
  }

  async function handleGoogleLogin() {
    if (actionBusy) return;
    try {
      setGoogleBusy(true);
      await signIn("google", { callbackUrl });
      // No setGoogleBusy(false) here; page will unmount on redirect
    } catch {
      setGoogleBusy(false);
      setErr("Google sign-in failed. Please try again.");
    }
  }

  function togglePasswordVisibility() {
    const input = passwordInputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;

    setShowPassword((prev) => !prev);

    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start, end);
    });
  }

  return (
    <>
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
          {/* Login card centered */}
          <div className="flex w-full items-center justify-center">
            <div className="auth-card-animate relative h-auto w-full max-w-lg rounded-[5px] border border-white/25 bg-white px-7 py-12 shadow-[0_1px_4px_rgba(15,23,42,0.16)] sm:min-h-[620px] sm:px-9 sm:py-14 sm:shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
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
              <h1 className="text-3xl font-semibold text-slate-900">
                Sign in
              </h1>
              <p className="mt-2 text-sm text-slate-700">
                Don&apos;t have an account?{" "}
                <Link
                  className="font-normal text-[#1b6fd1] underline underline-offset-2 hover:text-[#1457a3]"
                  href="/register"
                >
                  Create an account
                </Link>
              </p>

              <form
                onSubmit={onSubmit}
                className="mt-6 flex flex-col gap-6"
                noValidate
              >
                {/* Fields */}
                <div className="space-y-4">
                  <div>
                    <label
                      className={`mb-1 block text-xs font-medium ${
                        fieldErrors.email ? "text-red-500" : "text-slate-700"
                      }`}
                    >
                      Email address
                    </label>
                    <input
                      className={`w-full rounded-md border-2 bg-white py-2.5 pl-[18px] pr-4 text-base text-slate-900 outline-none transition focus-visible:border-[#6D6AF4] focus-visible:ring-0 sm:text-sm ${
                        fieldErrors.email ? "border-red-500" : "border-slate-300 hover:border-slate-400"
                      }`}
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email && e.target.value.trim().length > 0) {
                          setFieldErrors((prev) => ({ ...prev, email: false }));
                        }
                        if (err) setErr(null);
                      }}
                      autoComplete="email"
                    />
                  </div>

                  <div>
                    <label
                      className={`mb-1 block text-xs font-medium ${
                        fieldErrors.password ? "text-red-500" : "text-slate-700"
                      }`}
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        ref={passwordInputRef}
                        className={`w-full rounded-md border-2 bg-white py-2.5 pl-[18px] pr-10 text-base text-slate-900 outline-none transition focus-visible:border-[#6D6AF4] focus-visible:ring-0 sm:text-[15px] ${
                          fieldErrors.password ? "border-red-500" : "border-slate-300 hover:border-slate-400"
                        }`}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password && e.target.value.trim().length > 0) {
                            setFieldErrors((prev) => ({ ...prev, password: false }));
                          }
                          if (err) setErr(null);
                        }}
                        autoComplete="current-password"
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
                  </div>

                  {err && <div className="text-sm text-red-600">{err}</div>}
                </div>

                {/* Actions */}
                <div className="space-y-4">
                  <button
                    type="submit"
                    disabled={actionBusy}
                    aria-disabled={actionBusy}
                    className="w-full rounded-md bg-[#1F2937] py-2.5 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-[#111827] active:scale-[0.985] active:bg-[#0B1220] active:brightness-95 active:transition active:duration-100 disabled:opacity-60 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F2937]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  >
                    {credentialBusy ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="h-4 w-4 animate-spin"
                          fill="none"
                        >
                          <circle cx="12" cy="12" r="9" className="stroke-white/30" strokeWidth="2.5" />
                          <path
                            d="M21 12a9 9 0 0 0-9-9"
                            className="stroke-white"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        Signing in...
                      </span>
                    ) : (
                      "Continue"
                    )}
                  </button>

                  <div className="my-6 flex items-center gap-2 text-gray-700">
                    <div className="h-px flex-1 bg-gray-400/50" />
                    <span className="text-sm text-black/70">Or</span>
                    <div className="h-px flex-1 bg-gray-400/50" />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={actionBusy}
                    aria-disabled={actionBusy}
                    className="flex w-full items-center justify-center gap-3 rounded-md border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:-translate-y-[1px] hover:border-slate-400 hover:shadow-md active:scale-[0.985] active:brightness-95 active:transition active:duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                    aria-label="Continue with Google"
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

                  <div className="text-center text-sm text-slate-800">
                    <Link
                      className="font-normal text-[#1b6fd1] underline underline-offset-2 hover:text-[#1457a3]"
                      href="/forgot-password"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                </div>
              </form>

            </div>
          </div>
        </div>
      </main>
    </>
  );
}
