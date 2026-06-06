"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { GUEST_PROJECT_STORAGE_KEY, type GuestProject } from "@/lib/guestProject";
import { PENDING_UPLOAD_STORAGE_KEY } from "@/lib/pendingUpload";

type UploadCtaProps = {
  variant?: "default" | "hero";
  className?: string;
  inputId?: string;
};

const STARTUP_OVERLAY_KEY = "mpdf:startup-overlay";
const STARTUP_OVERLAY_CONTEXT_KEY = "mpdf:startup-overlay-context";

export default function UploadCta({
  variant = "default",
  className,
  inputId,
}: UploadCtaProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isHero = variant === "hero";

  async function handleClick() {
    setBusy(true);
    setError(null);
    setBusy(false);

    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) {
      setBusy(false);
      return;
    }

    if (typeof window !== "undefined") {
      try {
        const existingRaw = window.localStorage?.getItem(GUEST_PROJECT_STORAGE_KEY);
        const existing = existingRaw ? (JSON.parse(existingRaw) as GuestProject) : null;
        if (!existing || existing.mode !== "guest" || typeof existing.id !== "string") {
          const id =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          const guestProject: GuestProject = {
            id,
            createdAt: Date.now(),
            mode: "guest",
            isPersisted: false,
            ownerId: null,
          };
          window.localStorage?.setItem(GUEST_PROJECT_STORAGE_KEY, JSON.stringify(guestProject));
        }
      } catch {
        // ignore storage failures
      }
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
    isHero ? "" : "flex flex-col items-center gap-3",
    className ?? "",
  ]
    .join(" ")
    .trim();

  const buttonClass = isHero
    ? "inline-flex items-center justify-center px-0 py-0 text-sm font-medium text-white/72 underline decoration-white/20 decoration-1 underline-offset-4 transition hover:text-white hover:decoration-white/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60"
    : "press-bounce w-full max-w-xl rounded-full border-2 border-slate-300 bg-[#024d7c] px-12 py-5 text-2xl font-semibold text-white shadow-2xl transition hover:-translate-y-1 hover:bg-[#013a60] hover:shadow-[0_20px_35px_rgba(2,77,124,0.35)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60";

  const content = (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-disabled={busy}
        aria-label={busy ? "Opening file picker" : "Upload PDF"}
        className={buttonClass}
      >
        {busy ? "Opening..." : isHero ? "Upload PDF" : "Browse files"}
      </button>
      <input
        id={inputId}
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </>
  );

  return isHero ? content : <div className={containerClass}>{content}</div>;
}
