"use client";

import dynamic from "next/dynamic";

const StudioClient = dynamic(() => import("./StudioClient"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[calc(100svh-120px)] w-full items-center justify-center px-6">
      <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-200 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#6C47FF]" />
        Opening studio...
      </div>
    </div>
  ),
});

export default function StudioClientLoader() {
  return <StudioClient />;
}
