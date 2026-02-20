"use client";

import { useCallback } from "react";

// Avatar uploads are disabled globally. Keep this hook API-compatible
// so existing components continue to render deterministic initials avatars.
export function useAvatarPreference(_profileId?: string | null) {
  void _profileId;

  const setAvatar = useCallback((value: string | null) => {
    void value;
    // no-op
  }, []);

  const clearAvatar = useCallback(() => {
    // no-op
  }, []);

  return { avatar: null as string | null, setAvatar, clearAvatar };
}
