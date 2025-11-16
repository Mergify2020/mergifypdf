"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

const avatarState = new Map<string, string | null>();
const listeners = new Map<string, Set<() => void>>();
const fetchInFlight = new Set<string>();

function emit(key: string, value: string | null) {
  avatarState.set(key, value);
  const set = listeners.get(key);
  set?.forEach((listener) => listener());
}

function subscribe(key: string, listener: () => void) {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) {
      listeners.delete(key);
    }
  };
}

async function hydrateFromServer(key: string) {
  if (fetchInFlight.has(key)) return;
  fetchInFlight.add(key);
  try {
    const res = await fetch("/api/account/update-email", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { image?: string | null };
    emit(key, data.image ?? null);
  } catch {
    // ignore network errors
  } finally {
    fetchInFlight.delete(key);
  }
}

export function useAvatarPreference(profileId?: string | null) {
  const storeKey = useMemo(() => profileId ?? "anonymous", [profileId]);

  useEffect(() => {
    if (profileId && !avatarState.has(storeKey)) {
      void hydrateFromServer(storeKey);
    }
  }, [storeKey, profileId]);

  const avatar = useSyncExternalStore(
    (callback) => subscribe(storeKey, callback),
    () => avatarState.get(storeKey) ?? null,
    () => null
  );

  const setAvatar = useCallback(
    (value: string | null) => {
      emit(storeKey, value);
    },
    [storeKey]
  );

  const clearAvatar = useCallback(() => {
    emit(storeKey, null);
  }, [storeKey]);

  return { avatar, setAvatar, clearAvatar };
}
