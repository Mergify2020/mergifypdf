"use client";

import { useRouter } from "next/navigation";
import { PROJECT_NAME_STORAGE_KEY, sanitizeProjectName } from "@/lib/projectName";

type Props = {
  className?: string;
};

export default function StartProjectButton({ className }: Props) {
  const router = useRouter();

  function handleClick() {
    const name = window.prompt("Name your project");
    if (name === null) return;
    const clean = sanitizeProjectName(name);
    try {
      window.localStorage?.setItem(PROJECT_NAME_STORAGE_KEY, clean);
    } catch {
      // ignore storage failures
    }
    router.push("/studio");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center rounded-full bg-white px-10 py-3 text-base font-semibold text-slate-900 shadow-xl shadow-black/20 transition hover:-translate-y-0.5 ${
        className ?? ""
      }`}
    >
      Start a new project
      <svg className="ml-2 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M7 17 17 7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 7h9v9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
