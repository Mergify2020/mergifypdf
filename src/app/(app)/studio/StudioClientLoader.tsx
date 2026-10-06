"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";

const StudioClient = dynamic(() => import("./StudioClient"), {
  ssr: false,
  loading: () => null,
});

export default function StudioClientLoader() {
  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("workspace-studio-shell-ready"));
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return <StudioClient />;
}
