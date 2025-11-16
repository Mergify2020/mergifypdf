"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "mergify-avatar";

type Listener = (value: string | null) => void;
const listeners = new Set<Listener>();

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
    listeners.forEach((listener) => listener(value));
    setAvatarState(value);
  }, []);

  useEffect(() => {
    const handler: Listener = (value) => setAvatarState(value);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const clearAvatar = useCallback(() => {
    persist(null);
  }, [persist]);

  return { avatar, setAvatar: persist, clearAvatar };
}
