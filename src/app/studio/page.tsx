"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudioLandingRedirect() {
  const router = useRouter();
  useEffect(() => {
    const projectId =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
    router.replace(`/studio/${projectId}`);
  }, [router]);

  return null;
}
