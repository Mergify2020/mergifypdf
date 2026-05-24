"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { resetAuthScopedClientState } from "@/lib/authClientState";

export default function AuthStateSync() {
  const router = useRouter();
  const { data: session } = useSession();
  const previousUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const nextUserId = session?.user?.id ?? null;
    if (previousUserIdRef.current === undefined) {
      previousUserIdRef.current = nextUserId;
      return;
    }

    if (previousUserIdRef.current === nextUserId) {
      return;
    }

    const previousUserId = previousUserIdRef.current ?? null;
    previousUserIdRef.current = nextUserId;
    resetAuthScopedClientState(previousUserId, nextUserId);
    router.refresh();
  }, [router, session?.user?.id]);

  return null;
}
