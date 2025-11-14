// src/app/login/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import LogoMerge from "@/components/LogoMerge";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid email or password.",
  EMAIL_NOT_VERIFIED: "Please verify your email before signing in. Check your inbox for the 6-digit code.",
  OAuthSignin: "Google sign-in failed. Please try again.",
  OAuthCallback: "Google sign-in failed. Please try again.",
  OAuthAccountNotLinked: "This email is already linked to a different sign-in method.",
  AccessDenied: "Access denied. Try a different account.",
  Configuration: "Sign-in is temporarily unavailable. Please try again later.",
  Verification: "Verification link expired. Request a new one.",
};

function getAuthError(code?: string | null) {
  if (!code) return null;
  return AUTH_ERROR_MESSAGES[code] ?? "Unable to sign in. Please try again.";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const queryError = searchParams.get("error");

  useEffect(() => {
    if (!queryError) return;
    setErr(getAuthError(queryError));
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
        callbackUrl: "/studio",
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

      window.location.assign("/studio");
    } catch (error) {
      console.error(error);
      setErr("Unable to sign in. Please try again.");
      setBusy(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setBusy(true);
      await signIn("google", { callbackUrl: "/studio" });
      // No setBusy(false) here; page will unmount on redirect
    } catch {
      setBusy(false);
      setErr("Google sign-in failed. Please try again.");
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-gray-600">
        Use the account you created, or reset your password below.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          className="w-full rounded border p-2 outline-none focus-visible:ring-2 focus-visible:ring-[#2A7C7C] focus-visible:border-[#2A7C7C]"
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
          className="w-full rounded border p-2 outline-none focus-visible:ring-2 focus-visible:ring-[#2A7C7C] focus-visible:border-[#2A7C7C]"
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
          className="w-full rounded bg-[#2A7C7C] text-white py-2 font-medium transition
                     hover:bg-[#256666] disabled:opacity-60 focus-visible:outline-none
                     focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2A7C7C]"
        >
          {busy ? "Signing in…" : "Continue"}
        </button>
      </form>

      {/* Divider */}
      <div className="my-5 flex items-center gap-2 text-gray-400">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Google Sign In */}
      <button
        onClick={handleGoogleLogin}
        disabled={busy}
        aria-disabled={busy}
        className="w-full border border-gray-300 rounded py-2 bg-white text-gray-700 font-medium hover:bg-gray-50 flex items-center justify-center gap-3 shadow-sm transition"
        aria-label="Continue with Google"
      >
        <img src="/google.svg" alt="Google logo" className="w-5 h-5" />
        <span>Continue with Google</span>
      </button>

      <div className="mt-4 space-y-1 text-center text-xs text-gray-500">
        <p>
          <Link
            className="underline text-[#2A7C7C] hover:text-[#256666]"
            href="/forgot-password"
          >
            Forgot your password?
          </Link>
        </p>
        <p>
          Don’t have an account?{" "}
          <Link
            className="underline text-[#2A7C7C] hover:text-[#256666]"
            href="/register"
          >
            Create one
          </Link>
        </p>
      </div>

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
    </main>
  );
}
