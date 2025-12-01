// src/app/login/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import LogoMerge from "@/components/LogoMerge";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid email or password.",
  EMAIL_NOT_VERIFIED: "Please verify your email before logging in. Check your inbox for the 6-digit code.",
  OAUTH_ONLY: "This account now uses Google login. Continue with Google instead.",
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(() => getAuthError(queryError));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!queryError) return;
    router.replace("/login", { scroll: false });
  }, [queryError, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: normalizedEmail,
        password,
        callbackUrl: "/",
      });

      if (res?.error) {
        setErr(getAuthError(res.error));
        setBusy(false);
        return;
      }

      if (res?.url) {
        window.location.assign(res.url);
        return;
      }

      window.location.assign("/");
    } catch (error) {
      console.error(error);
      setErr("Unable to log in. Please try again.");
      setBusy(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setBusy(true);
      await signIn("google", { callbackUrl: "/" });
      // No setBusy(false) here; page will unmount on redirect
    } catch {
      setBusy(false);
      setErr("Google sign-in failed. Please try again.");
    }
  }

  return (
    <>
      <main
        data-login-page
        className="relative flex min-h-[calc(100vh-220px)] w-full items-center justify-center overflow-hidden bg-slate-950 px-4 py-4 sm:py-6"
      >
        {/* Darkened hero team background, behind card but above base color */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <Image
            src="/login-picture.svg"
            alt="MergifyPDF login background"
            fill
            className="object-cover"
            priority={false}
          />
          <div className="absolute inset-0 bg-slate-950/30" />
        </div>

        {/* Layout container to keep card on the left, right side open */}
        <div className="relative z-10 flex w-full max-w-6xl items-center justify-between">
          {/* Frosted-glass login card on the left */}
          <div className="flex w-full flex-1 justify-center lg:justify-start">
            <div
              className="w-full max-w-md rounded-[26px] border border-white/25 bg-white/25 px-6 py-8 shadow-[0_30px_90px_rgba(15,23,42,0.35)] backdrop-blur-2xl sm:px-8 sm:py-9"
              style={{ backdropFilter: "blur(20px)" }}
            >
              <h1 className="text-2xl font-semibold text-slate-900">Log in</h1>
              <p className="mt-1 text-sm text-slate-700">
                Use the account you created, or reset your password below.
              </p>

              <form
                onSubmit={onSubmit}
                className="mt-6 flex flex-col gap-6"
              >
                {/* Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-700">
                      Email
                    </label>
                    <input
                      className="w-full rounded-full border border-white/60 bg-white/85 px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-[#024d7c] focus-visible:ring-2 focus-visible:ring-[#024d7c]/70"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (err) setErr(null);
                      }}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-slate-700">
                      Password
                    </label>
                    <input
                      className="w-full rounded-full border border-white/60 bg-white/85 px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-[#024d7c] focus-visible:ring-2 focus-visible:ring-[#024d7c]/70"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (err) setErr(null);
                      }}
                      required
                      autoComplete="current-password"
                    />
                  </div>

                  {err && <div className="text-sm text-red-600">{err}</div>}
                </div>

                {/* Actions */}
                <div className="space-y-4">
                  <button
                    type="submit"
                    disabled={busy}
                    aria-disabled={busy}
                    className="w-full rounded-full bg-[#024d7c] py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#013a60] hover:shadow-lg disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  >
                    {busy ? "Signing in…" : "Continue"}
                  </button>

                  <p className="text-center text-xs text-slate-700">
                    or continue with
                  </p>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={busy}
                    aria-disabled={busy}
                    className="flex w-full items-center justify-center gap-3 rounded-full border border-white/70 bg-white/85 px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                    aria-label="Continue with Google"
                  >
                    <img src="/google.svg" alt="Google logo" className="h-5 w-5" />
                    <span>Continue with Google</span>
                  </button>

                  <div className="space-y-1 text-center text-xs text-slate-800">
                    <p>
                      <Link
                        className="font-medium text-[#024d7c] underline-offset-2 hover:text-[#013a60] hover:underline"
                        href="/forgot-password"
                      >
                        Forgot your password?
                      </Link>
                    </p>
                    <p>
                      Don&apos;t have an account?{" "}
                      <Link
                        className="font-medium text-[#024d7c] underline-offset-2 hover:text-[#013a60] hover:underline"
                        href="/register"
                      >
                        Create one
                      </Link>
                    </p>
                  </div>
                </div>
              </form>
            </div>
          </div>
          <div className="hidden flex-1 lg:block" />
        </div>

        {/* Minimal footer at bottom center */}
        <div className="pointer-events-auto absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-[11px] text-slate-200/90">
          <span>© {new Date().getFullYear()} MergifyPDF</span>
          <span className="mx-2">•</span>
          <Link href="/terms-of-service" className="hover:text-white">
            Terms
          </Link>
          <span className="mx-2">•</span>
          <Link href="/privacy-policy" className="hover:text-white">
            Privacy
          </Link>
        </div>
      </main>

      {/* Full-screen loading overlay */}
      {busy && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-white/90 backdrop-blur">
          <div className="flex flex-col items-center gap-3">
            <LogoMerge size={72} />
            <p className="text-sm text-gray-600">
              {err ? "Please try again…" : "Signing you in…"}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
