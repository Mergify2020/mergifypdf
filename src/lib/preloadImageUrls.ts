"use client";

export function preloadImageUrls(urls: string[]) {
  if (typeof window === "undefined") return;
  const unique = Array.from(new Set(urls)).filter(Boolean);
  if (unique.length === 0) return;

  const run = () => {
    unique.forEach((url) => {
      const img = new window.Image();
      img.decoding = "async";
      img.loading = "eager";
      img.src = url;
    });
  };

  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(run, { timeout: 800 });
    return;
  }

  globalThis.setTimeout(run, 0);
}
