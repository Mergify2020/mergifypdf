"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Moon, Sun } from "lucide-react";
import { useSession } from "next-auth/react";
import SettingsMenu from "@/components/SettingsMenu";
import { getAvatarFallback } from "@/lib/avatarFallback";
import { applyThemePreference, persistThemePreference, type ThemeMode } from "@/lib/theme";

type TrashHeaderControlsProps = {
  accountName: string;
  accountEmail?: string | null;
};

export default function TrashHeaderControls({ accountName, accountEmail }: TrashHeaderControlsProps) {
  const { data: session } = useSession();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("theme") === "dark" ? "dark" : "light";
  });
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const profileName = (session?.user?.name ?? accountName ?? "").trim();
  const profileEmail = (session?.user?.email ?? accountEmail ?? "").trim();
  const hasProfileInfo = Boolean(profileName || profileEmail);
  const avatar = (session?.user as { image?: string | null } | undefined)?.image ?? null;
  const avatarKey = session?.user?.id ?? session?.user?.email ?? profileEmail ?? profileName ?? null;
  const fallbackAvatar = getAvatarFallback(avatarKey, profileName || profileEmail || null);
  const showAvatarImage = Boolean(avatar) && !avatarLoadFailed;

  useEffect(() => {
    applyThemePreference(theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    persistThemePreference(nextTheme);
    applyThemePreference(nextTheme);
    setTheme(nextTheme);
  };

  return (
    <div className="flex h-11 flex-nowrap items-center gap-2 shrink-0 w-[168px] min-w-[168px] max-w-[168px] opacity-100 transition-none md:w-[276px] md:min-w-[276px] md:max-w-[276px] md:transition-[width,max-width,opacity] md:duration-200 md:ease-out">
      <button
        type="button"
        onClick={toggleTheme}
        className="hidden shrink-0 h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-gray-200 bg-white text-[#1F2A37] shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/15 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)] dark:hover:bg-zinc-800 dark:focus-visible:ring-[#2563EB]/30 sm:flex"
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        aria-pressed={theme === "dark"}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
      </button>
      <SettingsMenu
        trigger="custom"
        triggerLabel="Open profile menu"
        triggerClassName="w-full min-w-0 max-w-full overflow-hidden flex h-11 items-center gap-1.5 rounded-full border-[1.5px] border-gray-200 bg-white py-1.5 pl-1 pr-1.5 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/15 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F1F4F9] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_1px_0_rgba(255,255,255,0.02),0_8px_18px_rgba(0,0,0,0.24)] dark:hover:bg-zinc-800 dark:focus-visible:ring-[#2563EB]/30 dark:focus-visible:ring-offset-[#222224]"
        triggerContent={
          <>
            <span className="shrink-0 pointer-events-none">
              {showAvatarImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar!}
                  alt="Your avatar"
                  className="h-8 w-8 rounded-full object-cover"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold uppercase text-white"
                  style={{ backgroundColor: fallbackAvatar.color }}
                >
                  {hasProfileInfo ? fallbackAvatar.initials : ""}
                </span>
              )}
            </span>
            {hasProfileInfo ? (
              <span className="flex min-w-0 flex-1 flex-col leading-tight text-left">
                {profileName ? (
                  <span className="truncate text-[13px] font-semibold text-[#1F2A37] dark:text-zinc-100">
                    {profileName}
                  </span>
                ) : null}
                {profileEmail ? (
                  <span className="truncate text-[11px] font-medium text-[#64748B] dark:text-zinc-400">
                    {profileEmail}
                  </span>
                ) : null}
              </span>
            ) : null}
            <ChevronDown className="h-4 w-4 shrink-0 text-[#94A3B8] dark:text-zinc-400" aria-hidden="true" />
          </>
        }
      />
    </div>
  );
}
