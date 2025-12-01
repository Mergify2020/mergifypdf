"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function TwoFactorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [code, setCode] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  async function sendCode() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/two-factor/challenge", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        const code = body?.code as string | undefined;
        if (code === "EMAIL_MISSING") {
          setError("We couldn’t find an email address for your account.");
        } else if (code === "TWO_FACTOR_NOT_ENABLED") {
          setError("Two-factor authentication is not enabled for this account.");
        } else {
          setError(body?.message ?? "We couldn’t send your code. Please try again.");
        }
        return;
      }
      setInfo("We sent a 6-digit code to your email. Enter it below.");
      setCooldown(25);
    } catch {
      setError("We couldn’t send your code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // Automatically send the code on first visit
    void sendCode();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (code.trim().length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const res = await fetch("/api/auth/two-factor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        const codeName = body?.code as string | undefined;
        if (codeName === "invalid_code") {
          setError("That code doesn’t match. Try again.");
        } else if (codeName === "expired") {
          setError("That code has expired. Request a new one.");
        } else {
          setError(body?.message ?? "Verification failed. Please try again.");
        }
        return;
      }

      router.replace(callbackUrl || "/");
      router.refresh();
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const email = session?.user?.email;

  // Full-screen overlay that sits above the global header so nothing behind it is clickable.
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white">
      <header className="flex h-[64px] items-center border-b border-slate-200 bg-white/95 px-4 shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-2"
            aria-label="Back to login"
          >
            {/* simple wordmark; reuse existing logo asset */}
            <img
              src="/logo-wordmark2.svg"
              alt="MergifyPDF"
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center gap-3">
            {/* Pricing pill to match login header */}
            <Link
              href="/account?view=pricing"
              className="inline-flex items-center rounded-full border-2 border-slate-300 bg-[#6A4EE8] px-7 py-2 text-xs font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#5A3FD8] hover:shadow-lg"
            >
              Pricing
            </Link>
            {/* Log in button only (no sign up on 2FA screen) */}
            <Link
              href="/login"
              className="hidden items-center rounded-full border border-slate-300 bg-transparent px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-white/70 sm:inline-flex"
            >
              Log in
            </Link>
            {/* Mobile log in button */}
            <Link
              href="/login"
              className="inline-flex items-center rounded-full border border-slate-300 bg-transparent px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-white/70 sm:hidden"
            >
              Log in
            </Link>
            <button
              type="button"
              onClick={() => {
                void signOut({ callbackUrl: "/login" });
              }}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-white px-4 py-8">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <img
            src="/Girl-picture.svg"
            alt="MergifyPDF background"
            className="h-full w-full object-cover object-left sm:object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-950/40 to-slate-950/10" />
        </div>

        <div className="relative z-10 w-full max-w-md rounded-[26px] border border-white/60 bg-white/85 px-6 py-8 shadow-[0_24px_70px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:px-8 sm:py-9">
          <h1 className="text-2xl font-semibold text-slate-900">Two-factor authentication</h1>
          <p className="mt-1 text-sm text-slate-700">
            Enter the 6-digit code we sent to{" "}
            <span className="font-medium">{email ?? "your email"}</span>.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="twofactor-code">
                Verification code
              </label>
              <input
                id="twofactor-code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="mt-1 w-full rounded-full border border-white/60 bg-white/85 px-4 py-2.5 text-center text-lg tracking-[6px] text-slate-900 shadow-sm outline-none transition focus-visible:border-[#024d7c] focus-visible:ring-2 focus-visible:ring-[#024d7c]/70"
                placeholder="______"
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {info && <p className="text-sm text-green-700">{info}</p>}

            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full rounded-full bg-[#024d7c] py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#013a60] disabled:opacity-60"
            >
              {busy ? "Verifying..." : "Confirm"}
            </button>

            <button
              type="button"
              onClick={() => {
                if (cooldown > 0 || busy) return;
                void sendCode();
              }}
              disabled={busy || cooldown > 0}
              className="w-full rounded-full border border-white/60 bg-white/85 px-4 py-2 text-sm text-slate-900 disabled:opacity-60"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
