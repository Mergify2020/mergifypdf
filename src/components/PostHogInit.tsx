"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";

export default function PostHogInit() {
  const didInitRef = useRef(false);

  useEffect(() => {
    if (didInitRef.current) return;

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (!key || !host) return;

    posthog.init(key, {
      api_host: host,
      defaults: "2026-01-30",
    });

    didInitRef.current = true;
  }, []);

  return null;
}
