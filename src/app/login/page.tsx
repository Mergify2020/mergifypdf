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
        className="mx-auto flex min-h-[70vh] w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:py-14 lg:flex-row lg:items-stretch"
      >
        {/* Left visual column */}
        <section className="relative hidden flex-1 overflow-hidden rounded-3xl bg-gradient-to-br from-[#FDF2FF] via-[#EEF2FF] to-[#E0F7FF] shadow-[0_24px_80px_rgba(15,23,42,0.15)] lg:flex">
          {/* Decorative blobs only in this column */}
          <div className="pointer-events-none absolute -top-32 -left-24 h-64 w-64 rounded-[999px] bg-gradient-to-br from-[#399BFF] via-[#6A4EE8] to-[#F044FF] opacity-25 blur-3xl" />
          <div className="pointer-events-none absolute -top-24 right-[-40px] h-56 w-56 rounded-[999px] bg-gradient-to-bl from-[#6A4EE8] via-[#399BFF] to-[#F044FF] opacity-20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-80px] left-1/2 h-64 w-64 -translate-x-1/2 rounded-[999px] bg-gradient-to-tl from-[#399BFF] via-[#6A4EE8] to-[#F044FF] opacity-15 blur-3xl" />

          <div className="relative z-10 flex w-full flex-col items-center justify-center px-10 py-10 text-center">
            <h2 className="text-xl font-semibold text-slate-900">
              Securely access your workspace.
            </h2>
            <p className="mt-2 max-w-md text-sm text-slate-600">
              Sign in to pick up where you left off, manage documents, and send
              signatures in a few clicks.
            </p>
            <div className="mt-8 w-full max-w-md rounded-2xl bg-white/80 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.18)] backdrop-blur">
              <Image
                src="/visual-hero3.png"
                alt="Preview of the MergifyPDF editor"
                width={640}
                height={420}
                className="h-auto w-full rounded-xl object-cover"
                priority={false}
              />
            </div>
          </div>
        </section>

        {/* Right login column */}
        <section className="flex flex-1 flex-col items-center justify-center lg:px-8">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.12)] sm:p-8">
            <h1 className="text-2xl font-semibold">Log in</h1>
            <p className="mt-1 text-sm text-gray-600">
              Use the account you created, or reset your password below.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-3">
              <input
                className="w-full rounded border p-2 outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c] focus-visible:border-[#024d7c]"
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
              <input
                className="w-full rounded border p-2 outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c] focus-visible:border-[#024d7c]"
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

              {err && <div className="text-sm text-red-600">{err}</div>}

              <button
                type="submit"
                disabled={busy}
                aria-disabled={busy}
                className="w-full rounded bg-[#024d7c] py-2 font-medium text-white transition hover:bg-[#013a60] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c] focus-visible:ring-offset-2"
              >
                {busy ? "Signing in…" : "Continue"}
              </button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-2 text-gray-400">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs">or</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleLogin}
              disabled={busy}
              aria-disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded border border-gray-300 bg-white py-2 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
              aria-label="Continue with Google"
            >
              <img src="/google.svg" alt="Google logo" className="h-5 w-5" />
              <span>Continue with Google</span>
            </button>

            <div className="mt-4 space-y-1 text-center text-xs text-gray-500">
              <p>
                <Link
                  className="text-[#024d7c] underline hover:text-[#013a60]"
                  href="/forgot-password"
                >
                  Forgot your password?
                </Link>
              </p>
              <p>
                Don’t have an account?{" "}
                <Link
                  className="text-[#024d7c] underline hover:text-[#013a60]"
                  href="/register"
                >
                  Create one
                </Link>
              </p>
            </div>
          </div>

          {/* Minimal footer below right column */}
          <div className="mt-6 text-center text-[11px] text-slate-400 lg:text-right">
            <span>© {new Date().getFullYear()} MergifyPDF</span>
            <span className="mx-2">•</span>
            <Link href="/terms-of-service" className="hover:text-slate-600">
              Terms
            </Link>
            <span className="mx-2">•</span>
            <Link href="/privacy-policy" className="hover:text-slate-600">
              Privacy
            </Link>
          </div>
        </section>
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
      <style jsx global>{`
        main[data-login-page] + footer {
          display: none;
        }
      `}</style>
    </>
  );
}
