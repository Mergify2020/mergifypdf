"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Moon, Sun } from "lucide-react";
import SettingsMenu from "@/components/SettingsMenu";

type TrashHeaderControlsProps = {
  accountName: string;
  accountEmail?: string | null;
};

export default function TrashHeaderControls({ accountName, accountEmail }: TrashHeaderControlsProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("theme");
    const initialTheme = stored === "dark" ? "dark" : "light";
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    document.body.classList.remove("dark");
    setTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.add("theme-transition");
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    if (nextTheme === "light") {
      document.body.classList.remove("dark");
    }
    window.localStorage.setItem("theme", nextTheme);
    document.cookie = `theme=${nextTheme}; path=/; max-age=31536000`;
    setTheme(nextTheme);
    window.setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 200);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleTheme}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#1F2A37] shadow-[12px_0_36px_rgba(15,23,42,0.10)] transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-[12px_0_36px_rgba(0,0,0,0.45)] dark:hover:bg-zinc-800"
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        aria-pressed={theme === "dark"}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
      </button>
      <div className="flex h-11 items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white py-1.5 pl-1 pr-1.5 shadow-[12px_0_36px_rgba(15,23,42,0.10)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-[12px_0_36px_rgba(0,0,0,0.45)]">
        <div className="shrink-0">
          <SettingsMenu />
        </div>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="max-w-[220px] truncate text-[13px] font-semibold text-[#1F2A37] dark:text-zinc-100">
            {accountName}
          </span>
          {accountEmail ? (
            <span className="max-w-[220px] truncate text-[11px] font-medium text-[#64748B] dark:text-zinc-400">
              {accountEmail}
            </span>
          ) : null}
        </span>
        <ChevronDown className="h-4 w-4 text-[#94A3B8] dark:text-zinc-400" aria-hidden="true" />
      </div>
    </div>
  );
}
