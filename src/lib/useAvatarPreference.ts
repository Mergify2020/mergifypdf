"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

const avatarState = new Map<string, string | null>();
const subscribers = new Map<string, Set<() => void>>();

function ensureKey(key: string, initial?: string | null) {
  if (!avatarState.has(key)) {
    avatarState.set(key, initial ?? null);
  } else if (initial && !avatarState.get(key)) {
    avatarState.set(key, initial);
  }
}

function subscribe(key: string, callback: () => void) {
  let set = subscribers.get(key);
  if (!set) {
    set = new Set();
    subscribers.set(key, set);
  }
  set.add(callback);
  return () => {
    set?.delete(callback);
    if (set && set.size === 0) {
      subscribers.delete(key);
    }
  };
}

function getSnapshot(key: string, initial?: string | null) {
  ensureKey(key, initial);
  return avatarState.get(key) ?? null;
}

function updateStore(key: string, value: string | null) {
  avatarState.set(key, value);
  const set = subscribers.get(key);
  set?.forEach((cb) => cb());
}

export function useAvatarPreference(profileId?: string | null, initialImage?: string | null) {
  const storeKey = useMemo(() => profileId ?? "anonymous", [profileId]);

  useEffect(() => {
    ensureKey(storeKey, initialImage);
  }, [storeKey, initialImage]);

  const avatar = useSyncExternalStore(
    (callback) => subscribe(storeKey, callback),
    () => getSnapshot(storeKey, initialImage),
    () => initialImage ?? null
  );

  const setAvatar = useCallback(
    (value: string | null) => {
      updateStore(storeKey, value);
    },
    [storeKey]
  );

  const clearAvatar = useCallback(() => {
    updateStore(storeKey, null);
  }, [storeKey]);

  return { avatar, setAvatar, clearAvatar };
}
