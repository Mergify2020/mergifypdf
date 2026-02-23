"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";

export default function PostHogIdentify() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  useEffect(() => {
    if (status !== "authenticated" || !userId) return;

    posthog.identify(userId, {
      email: session.user?.email ?? null,
      name: session.user?.name ?? null,
      stripeStatus: session.user?.stripeStatus ?? null,
      authType: session.user?.authType ?? null,
    });
  }, [
    status,
    userId,
    session?.user?.email,
    session?.user?.name,
    session?.user?.stripeStatus,
    session?.user?.authType,
  ]);

  return null;
}
