"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "mergify-avatar";

export function useAvatarPreference() {
  const [avatar, setAvatarState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) {
        setAvatarState(event.newValue);
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const persist = useCallback((value: string | null) => {
    if (typeof window === "undefined") return;
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setAvatarState(value);
  }, []);

  const clearAvatar = useCallback(() => {
    persist(null);
  }, [persist]);

  return { avatar, setAvatar: persist, clearAvatar };
}
