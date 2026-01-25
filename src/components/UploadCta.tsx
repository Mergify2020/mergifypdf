"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PENDING_UPLOAD_STORAGE_KEY } from "@/lib/pendingUpload";

type UploadCtaProps = {
  usedToday: boolean;
  variant?: "default" | "hero";
  className?: string;
};

const STARTUP_OVERLAY_KEY = "mpdf:startup-overlay";
const STARTUP_OVERLAY_CONTEXT_KEY = "mpdf:startup-overlay-context";

export default function UploadCta({ usedToday, variant = "default", className }: UploadCtaProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [alreadyUsed, setAlreadyUsed] = useState(usedToday);
  const [error, setError] = useState<string | null>(null);
  const isHero = variant === "hero";

  async function handleClick() {
    if (alreadyUsed) {
      router.push("/pricing");
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const res = await fetch("/api/quota", {
        method: "POST",
        cache: "no-store",
      });

      if (res.status === 403) {
        setAlreadyUsed(true);
        setBusy(false);
        router.push("/pricing");
        return;
      }
    } catch (err) {
      console.error("Quota check failed", err);
      // continue and allow upload for now
    } finally {
      setBusy(false);
    }

    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) {
      setBusy(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (typeof window !== "undefined") {
          window.localStorage?.setItem(
            PENDING_UPLOAD_STORAGE_KEY,
            JSON.stringify({ name: file.name, data: reader.result })
          );
          window.sessionStorage?.setItem(STARTUP_OVERLAY_KEY, "1");
          window.sessionStorage?.setItem(STARTUP_OVERLAY_CONTEXT_KEY, "new");
        }
        router.push("/studio");
      } catch (err) {
        console.error("Failed to stage upload", err);
        setError("Unable to prepare that file. Please try a smaller PDF.");
      } finally {
        setBusy(false);
      }
    };
    reader.onerror = () => {
      setError("Unable to read that file. Please try again.");
      setBusy(false);
    };
    reader.readAsDataURL(file);
  }

  const containerClass = [
    isHero ? "flex flex-col items-center gap-2" : "flex flex-col items-center gap-3",
    className ?? "",
  ]
    .join(" ")
    .trim();

  const buttonClass = isHero
    ? "press-bounce w-full rounded-xl border border-white/20 bg-gradient-to-r from-[#6D5EF3] to-[#8B7CFF] px-12 py-3.5 text-base font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_10px_18px_rgba(109,94,243,0.24)] ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:from-[#7567F5] hover:to-[#9486FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5EF3]/35 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
    : "press-bounce w-full max-w-xl rounded-full border-2 border-slate-300 bg-[#024d7c] px-12 py-5 text-2xl font-semibold text-white shadow-2xl transition hover:-translate-y-1 hover:bg-[#013a60] hover:shadow-[0_20px_35px_rgba(2,77,124,0.35)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className={containerClass}>
      <button type="button" onClick={handleClick} disabled={busy} aria-disabled={busy} className={buttonClass}>
        {alreadyUsed ? "Upgrade to keep going" : busy ? "Opening..." : "Upload your document"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
