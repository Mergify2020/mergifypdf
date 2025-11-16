"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const STORAGE_PREFIX = "mergify-avatar";

type Subscriber = () => void;
const subscribers = new Map<string, Set<Subscriber>>();

function storageKeyFor(profileId?: string | null) {
  return profileId ? `${STORAGE_PREFIX}:${profileId}` : STORAGE_PREFIX;
}

function subscribeKey(key: string, callback: Subscriber) {
  if (typeof window === "undefined") return () => {};
  let set = subscribers.get(key);
  if (!set) {
    set = new Set();
    subscribers.set(key, set);
  }
  set.add(callback);

  function handleStorage(event: StorageEvent) {
    if (!event.key || event.key === key) {
      callback();
    }
  }

  window.addEventListener("storage", handleStorage);
  return () => {
    set?.delete(callback);
    window.removeEventListener("storage", handleStorage);
    if (set && set.size === 0) {
      subscribers.delete(key);
    }
  };
}

function getSnapshotForKey(key: string) {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

export function useAvatarPreference(profileId?: string | null) {
  const storageKey = useMemo(() => storageKeyFor(profileId), [profileId]);

  const avatar = useSyncExternalStore(
    (callback) => subscribeKey(storageKey, callback),
    () => getSnapshotForKey(storageKey),
    () => null
  );

  const persist = useCallback(
    (value: string | null) => {
      if (typeof window === "undefined") return;
      if (value) {
        window.localStorage.setItem(storageKey, value);
      } else {
        window.localStorage.removeItem(storageKey);
      }
      const set = subscribers.get(storageKey);
      set?.forEach((listener) => listener());
    },
    [storageKey]
  );

  const clearAvatar = useCallback(() => persist(null), [persist]);

  return { avatar, setAvatar: persist, clearAvatar };
}
