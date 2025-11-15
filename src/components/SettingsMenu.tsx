"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export default function SettingsMenu() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function handleToggle() {
    setOpen((prev) => !prev);
  }

  function handleAccount() {
    setOpen(false);
    router.push("/account");
  }

  async function handleSignOut() {
    try {
      setBusy(true);
      setOpen(false);
      await signOut({ callbackUrl: "/login" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="rounded-lg border px-3 py-1 text-sm font-medium hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#024d7c]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Settings
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-48 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-xl">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleAccount}
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#024d7c]"
            >
              Account
            </button>
            <div className="h-px bg-gray-200" aria-hidden="true" />
            <button
              type="button"
              onClick={handleSignOut}
              disabled={busy}
              aria-disabled={busy}
              className="mt-1 w-full rounded-lg bg-red-500 px-4 py-3 text-base font-semibold text-white transition hover:bg-red-600 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
