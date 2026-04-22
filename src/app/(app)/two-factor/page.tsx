"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function TwoFactorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [codeDigits, setCodeDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const callbackUrl = searchParams.get("callbackUrl") || "/projects/all";
  const codeValue = useMemo(() => codeDigits.join(""), [codeDigits]);
  const email = session?.user?.email ?? "your email";

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

  function focusCodeIndex(index: number) {
    codeRefs.current[index]?.focus();
  }

  function updateCodeDigit(index: number, value: string) {
    setCodeDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function sendCode(force?: boolean) {
    setSendingCode(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/two-factor/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: !!force }),
      });
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
      setInfo("We sent a 6-digit code to your email.");
      setCooldown(25);
    } catch {
      setError("We couldn’t send your code. Please try again.");
    } finally {
      setSendingCode(false);
    }
  }

  useEffect(() => {
    void sendCode(false);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (codeValue.trim().length !== 6) {
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
        body: JSON.stringify({ code: codeValue.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        const code = body?.code as string | undefined;
        if (code === "invalid_code") {
          setError("That code doesn’t match. Try again.");
        } else if (code === "expired") {
          setError("That code has expired. Request a new one.");
        } else {
          setError(body?.message ?? "Verification failed. Please try again.");
        }
        return;
      }

      router.replace(callbackUrl || "/projects/all");
      router.refresh();
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      data-login-page
      className="relative box-border flex min-h-[calc(100svh-46px)] w-full justify-center overflow-x-hidden bg-transparent px-0 py-0 sm:min-h-[calc(100svh-40px)] sm:py-0 md:items-center"
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

      <div className="page-fade-in relative z-10 mx-auto flex min-h-[calc(100svh-46px)] w-full max-w-7xl items-center justify-center px-4 py-6 sm:min-h-[calc(100svh-40px)] sm:py-0 lg:px-6">
        <div className="flex w-full items-center justify-center">
          <div className="auth-card-animate-left relative h-auto w-full max-w-lg rounded-[5px] border border-white/25 bg-white px-7 py-12 shadow-[0_1px_4px_rgba(15,23,42,0.16)] sm:min-h-[620px] sm:px-9 sm:py-14 sm:shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
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
              Verify your identity
            </h1>
            <p className="mt-2 text-sm text-slate-700">
              Enter the code we just sent to{" "}
              <span className="font-medium">{email}</span>.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Verification code
                </label>
                <div className="mx-auto flex w-full max-w-[320px] items-center justify-between gap-2 sm:w-fit sm:max-w-none sm:gap-4">
                  {codeDigits.map((digit, index) => (
                    <input
                      key={`twofactor-code-${index}`}
                      ref={(el) => {
                        codeRefs.current[index] = el;
                      }}
                      autoFocus={index === 0}
                      className="h-12 w-10 rounded-lg border-2 border-slate-300 bg-white text-center text-xl text-slate-900 outline-none transition hover:border-slate-400 focus-visible:border-[#6D6AF4] focus-visible:ring-0 sm:h-16 sm:w-[60px] sm:text-[1.375rem]"
                      type="text"
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => {
                        const value = event.target.value.replace(/\D/g, "");
                        if (!value) {
                          updateCodeDigit(index, "");
                          return;
                        }
                        updateCodeDigit(index, value[0] ?? "");
                        if (index < 5) {
                          focusCodeIndex(index + 1);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Backspace" && !digit && index > 0) {
                          updateCodeDigit(index - 1, "");
                          focusCodeIndex(index - 1);
                        }
                        if (event.key === "ArrowLeft" && index > 0) {
                          focusCodeIndex(index - 1);
                        }
                        if (event.key === "ArrowRight" && index < 5) {
                          focusCodeIndex(index + 1);
                        }
                      }}
                      onPaste={(event) => {
                        const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
                        if (!pasted) return;
                        event.preventDefault();
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
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}
              {info && <div className="text-sm text-green-700">{info}</div>}

              <button
                className="w-full rounded-md bg-[#1F2937] py-2.5 text-sm font-semibold text-white transition hover:-translate-y-[1px] hover:bg-[#111827] active:scale-[0.985] active:bg-[#0B1220] active:brightness-95 active:transition active:duration-100 disabled:opacity-60 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F2937]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                type="submit"
                disabled={busy || sendingCode || codeValue.length !== 6}
              >
                {sendingCode ? "Sending…" : busy ? "Confirming…" : "Confirm code"}
              </button>

              <button
                type="button"
                className="w-full rounded-md border-2 border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 transition hover:-translate-y-[1px] hover:border-slate-400 hover:shadow-md active:scale-[0.985] active:brightness-95 active:transition active:duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#024d7c]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:opacity-60"
                onClick={() => {
                  if (cooldown > 0 || busy || sendingCode) return;
                  void sendCode(true);
                }}
                disabled={busy || sendingCode || cooldown > 0}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>

              <button
                type="button"
                className="w-full text-sm font-medium text-slate-600 underline underline-offset-4 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D6AF4]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                onClick={() => {
                  void signOut({ callbackUrl: "/login" });
                }}
              >
                Back to login
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
