"use client";

import { FileUp } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PENDING_UPLOAD_STORAGE_KEY } from "@/lib/pendingUpload";

const STARTUP_OVERLAY_KEY = "mpdf:startup-overlay";
const STARTUP_OVERLAY_CONTEXT_KEY = "mpdf:startup-overlay-context";

export default function HeroUploadCard() {
  const router = useRouter();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openFilePicker() {
    if (busy) return;
    setError(null);
    fileInputRef.current?.click();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        window.localStorage?.setItem(
          PENDING_UPLOAD_STORAGE_KEY,
          JSON.stringify({ name: file.name, data: reader.result })
        );
        window.sessionStorage?.setItem(STARTUP_OVERLAY_KEY, "1");
        window.sessionStorage?.setItem(STARTUP_OVERLAY_CONTEXT_KEY, "new");
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

  return (
    <div
      className="upload-card-animate flex flex-1 flex-col justify-center rounded-2xl border-[3px] border-dashed border-[#6D5EF3] bg-gradient-to-b from-white/85 via-slate-50/90 to-white/80 px-8 py-12 shadow-[0_0_0_1px_rgba(148,163,184,0.18),0_18px_40px_rgba(15,23,42,0.08)] transition-shadow duration-200 hover:shadow-[0_0_0_1px_rgba(109,94,243,0.2),0_22px_46px_rgba(15,23,42,0.12)] active:shadow-[0_0_0_1px_rgba(109,94,243,0.2),0_16px_34px_rgba(15,23,42,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5EF3]/40"
      role="button"
      tabIndex={0}
      onClick={openFilePicker}
      onKeyDown={handleKeyDown}
      aria-busy={busy}
    >
      <div className="mb-5 flex justify-center">
        <FileUp
          className="h-16 w-16 text-[#6D5EF3] drop-shadow-[0_10px_26px_rgba(109,94,243,0.35)]"
          aria-hidden="true"
        />
      </div>
      <p className="hidden text-lg font-semibold text-slate-900 md:block">Drag & drop to upload</p>
      <div className="mt-4 hidden w-full items-center justify-center gap-3 md:flex">
        <span className="h-[2px] w-20 bg-slate-400/90" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">OR</span>
        <span className="h-[2px] w-20 bg-slate-400/90" aria-hidden="true" />
      </div>
      <div className="mt-4 flex justify-center md:mt-4">
        <label
          htmlFor={inputId}
          className="inline-flex items-center justify-center rounded-xl bg-[#6D5EF3] px-6 py-2.5 text-base font-semibold text-white shadow-[0_12px_24px_rgba(109,94,243,0.25)] transition hover:bg-[#7567F5] hover:shadow-[0_14px_28px_rgba(109,94,243,0.3)] active:translate-y-0.5 active:shadow-[0_10px_20px_rgba(109,94,243,0.22)] md:hidden"
        >
          Select files
        </label>
        <label
          htmlFor={inputId}
          className="hidden items-center justify-center rounded-xl bg-[#6D5EF3] px-6 py-2.5 text-base font-semibold text-white shadow-[0_12px_24px_rgba(109,94,243,0.25)] transition hover:bg-[#7567F5] hover:shadow-[0_14px_28px_rgba(109,94,243,0.3)] active:translate-y-0.5 active:shadow-[0_10px_20px_rgba(109,94,243,0.22)] md:inline-flex"
        >
          Browse files
        </label>
      </div>
      <p className="mt-6 text-xs text-slate-500">
        Every tool lives inside your workspace after upload.
      </p>
      <input
        id={inputId}
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      {error ? <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}
