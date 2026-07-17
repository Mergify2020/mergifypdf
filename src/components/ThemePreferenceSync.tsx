"use client";

import { useEffect } from "react";
import { applyThemePreference } from "@/lib/theme";

export default function ThemePreferenceSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") {
      applyThemePreference(stored);
    }
  }, []);

  return null;
}
