"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type UploadCtaProps = {
  usedToday: boolean;
};

export default function UploadCta({ usedToday }: UploadCtaProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [alreadyUsed, setAlreadyUsed] = useState(usedToday);
  const [error, setError] = useState<string | null>(null);

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
        router.push("/studio");
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

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-disabled={busy}
        className="w-full max-w-sm rounded-full bg-[#024d7c] px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-[#013a60] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {alreadyUsed ? "Sign up to keep going" : busy ? "Opening..." : "Upload PDF"}
      </button>
      {alreadyUsed && (
        <p className="text-sm text-gray-500">
          You have used today's free upload. Create an account for unlimited access.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
