"use client";

import dynamic from "next/dynamic";

const StudioClient = dynamic(() => import("./StudioClient"), {
  ssr: false,
  loading: () => null,
});

export default function StudioClientLoader() {
  return <StudioClient />;
}
