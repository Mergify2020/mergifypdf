"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

// Tell Next not to prerender this page at build (avoids CSR bailout during export)
export const dynamic = "force-dynamic";

function ResetPasswordInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);

    try {
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasSpecial = /[^A-Za-z0-9]/.test(password);
      if (password.trim().length < 8 || !hasUppercase || !hasLowercase || !hasSpecial) {
        throw new Error(
          "Password must be at least 8 characters and include uppercase, lowercase, and a special character."
        );
      }
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }
      const res = await fetch("/api/auth/password/reset-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Reset failed");
      setMsg(null);
      window.setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      if (message.toLowerCase().includes("invalid or expired token")) {
        setErr("This reset link has expired. Start a new password reset to continue.");
      } else {
        setErr(message);
      }
    } finally {
      setBusy(false);
    }
  }

  function togglePasswordVisibility() {
    setShowPassword((prev) => !prev);
  }

  function toggleConfirmPasswordVisibility() {
    setShowConfirmPassword((prev) => !prev);
  }

  return (
    <main
      data-login-page
      className="relative box-border flex min-h-[calc(100svh-46px)] w-full justify-center overflow-x-hidden bg-transparent px-0 py-0 sm:min-h-[calc(100svh-40px)] sm:py-6 md:items-center"
    >
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <Image
          src="/backgrounds/login-page-background-v5.svg"
          alt="MergifyPDF login background"
          fill
          className="object-cover object-left sm:object-center"
          priority={false}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-46px)] w-full max-w-7xl items-center justify-center px-4 py-6 sm:min-h-[calc(100svh-40px)] sm:py-0 lg:px-6">
        <div className="flex w-full items-center justify-center">
          <div className="auth-card-animate h-auto w-full max-w-lg rounded-[5px] border border-white/25 bg-white px-7 py-12 shadow-[0_1px_4px_rgba(15,23,42,0.16)] sm:min-h-[620px] sm:px-9 sm:py-14 sm:shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
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
            <h1 className="text-3xl font-semibold text-slate-900">Create a new password</h1>
            <p className="mt-2 text-sm text-slate-700">
              Pick a strong password to keep your account secure.
            </p>

            {!token && (
              <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                Missing token. Please use the link from your email.
              </div>
            )}

            <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full rounded-md border-2 bg-white py-2.5 pl-[18px] pr-10 text-sm text-slate-900 outline-none transition focus-visible:border-[#6D6AF4] focus-visible:ring-0 border-slate-300 hover:border-slate-400"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
                  At least 8 characters, including uppercase, lowercase, and a special character.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full rounded-md border-2 bg-white py-2.5 pl-[18px] pr-10 text-sm text-slate-900 outline-none transition focus-visible:border-[#6D6AF4] focus-visible:ring-0 border-slate-300 hover:border-slate-400"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={toggleConfirmPasswordVisibility}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-3 flex h-full items-center justify-center text-slate-500 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D6AF4]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    {showConfirmPassword ? (
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

              {err && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  <p>{err}</p>
                  {err.includes("reset link has expired") ? (
                    <Link
                      href="/forgot-password"
                      className="mt-2 inline-flex text-xs font-semibold text-rose-700 underline underline-offset-2 hover:text-rose-800"
                    >
                      Request a new reset code
                    </Link>
                  ) : null}
                </div>
              )}
              {msg && <div className="text-sm text-emerald-600">{msg}</div>}

              <button
                className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-[#1f2937] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#111827] disabled:opacity-60"
                disabled={busy || !token}
              >
                {busy ? "Saving…" : "Save password"}
              </button>
              <Link
                href="/login"
                className="text-center text-xs font-medium text-[#1b6fd1] underline underline-offset-2 hover:text-[#1457a3]"
              >
                Back to sign in
              </Link>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-600">Loading…</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
