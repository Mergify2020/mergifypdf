"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PrintPage() {
  const searchParams = useSearchParams();
  const src = searchParams.get("src") ?? "";
  const title = searchParams.get("title") ?? "Document";
  const [loaded, setLoaded] = useState(false);

  const safeTitle = useMemo(() => {
    const trimmed = title.trim();
    return trimmed.length > 0 ? trimmed : "Document";
  }, [title]);

  useEffect(() => {
    if (!safeTitle) return;
    document.title = `${safeTitle} - Print`;
  }, [safeTitle]);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      window.print();
    }, 250);
    return () => {
      window.clearTimeout(timer);
    };
  }, [loaded]);

  if (!src) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 text-center text-slate-700">
        <p>Missing PDF source.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <iframe
        title={`${safeTitle} PDF`}
        src={src}
        className="h-screen w-full border-0"
        onLoad={() => setLoaded(true)}
      />
    </main>
  );
}
