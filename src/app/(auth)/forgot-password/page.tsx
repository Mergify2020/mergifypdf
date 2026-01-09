// src/app/forgot-password/page.tsx
"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
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
        setMessage("Reset link has been sent.");
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
      setStatus("done");
    }
  }

  return (
    <main className="relative flex min-h-[calc(100vh-76px)] w-full items-center justify-center overflow-hidden bg-white px-0 py-4 sm:py-6">
      {/* Background image + overlay */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <img
          src="/reset-back.svg"
          alt="Password reset background"
          className="h-full w-full object-cover object-left sm:object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/65 via-slate-950/35 to-slate-950/15" />
      </div>

      {/* Layout container similar to register page */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 lg:px-6">
        {/* Frosted-glass reset-password card on the left */}
        <div className="flex w-full flex-1 justify-start">
          <div
            className="w-full max-w-md rounded-[26px] border border-white/60 bg-white/80 px-6 py-8 shadow-[0_24px_70px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:px-8 sm:py-9"
            style={{ backdropFilter: "blur(20px)" }}
          >
            <h1 className="text-2xl font-semibold text-slate-900">Forgot your password?</h1>
            <p className="mt-1 text-sm text-slate-700">
              Enter your email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Email
                </label>
                <input
                  className="w-full rounded-full border border-white/60 bg-white/85 px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-[#024d7c] focus-visible:ring-2 focus-visible:ring-[#024d7c]/70"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {message && (
                <div
                  className={`text-sm ${
                    isError ? "text-red-600" : "text-green-700"
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                className="w-full rounded-full bg-[#024d7c] py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#013a60] disabled:opacity-60"
                type="submit"
                disabled={status === "loading"}
              >
                {status === "loading" ? "Sending\u2026" : "Send reset link"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-2 text-gray-700">
              <div className="h-[2px] flex-1 bg-gray-400" />
              <span className="text-xs uppercase tracking-wide text-black">OR</span>
              <div className="h-[2px] flex-1 bg-gray-400" />
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
              disabled={status === "loading"}
              aria-disabled={status === "loading"}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-white/70 bg-white/85 px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-white disabled:opacity-60"
            >
              <img src="/google.svg" alt="Google logo" className="h-5 w-5" />
              <span>Continue with Google</span>
            </button>

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
