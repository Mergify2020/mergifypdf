"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type UploadCtaProps = {
  usedToday: boolean;
  variant?: "default" | "hero";
  className?: string;
};

export default function UploadCta({ usedToday, variant = "default", className }: UploadCtaProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [alreadyUsed, setAlreadyUsed] = useState(usedToday);
  const [error, setError] = useState<string | null>(null);
  const isHero = variant === "hero";

  async function handleClick() {
    if (alreadyUsed) {
      router.push("/register");
      return;
    }

    try {
      setBusy(true);
      setError(null);

      const res = await fetch("/api/quota", {
        method: "POST",
        cache: "no-store",
      });

      if (res.ok) {
        router.push("/");
        return;
      }

      if (res.status === 403) {
        setAlreadyUsed(true);
        setBusy(false);
        router.push("/register");
        return;
      }

      throw new Error("quota_request_failed");
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  const containerClass = [
    isHero ? "flex flex-col items-center gap-2" : "flex flex-col items-center gap-3",
    className ?? "",
  ]
    .join(" ")
    .trim();

  const buttonClass = isHero
    ? "w-full rounded-full bg-[#024d7c] px-10 py-4 text-lg font-semibold text-white shadow-[0_20px_35px_rgba(2,77,124,0.35)] transition hover:-translate-y-1 hover:bg-[#013a60] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
    : "w-full max-w-xl rounded-full bg-[#024d7c] px-12 py-5 text-2xl font-semibold text-white shadow-2xl transition hover:-translate-y-1 hover:bg-[#013a60] hover:shadow-[0_20px_35px_rgba(2,77,124,0.35)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className={containerClass}>
      <button type="button" onClick={handleClick} disabled={busy} aria-disabled={busy} className={buttonClass}>
        {alreadyUsed ? "Upgrade to keep going" : busy ? "Opening..." : "Upload a document"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
