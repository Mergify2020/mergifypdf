"use client";

import { useEffect } from "react";

export default function FeaturesAutoScroll() {
  useEffect(() => {
    const shouldScroll =
      window.location.hash === "#features" ||
      window.sessionStorage.getItem("scrollToFeatures") === "1";

    if (!shouldScroll) return;

    try {
      window.sessionStorage.removeItem("scrollToFeatures");
    } catch {
      // no-op
    }

    const runScroll = () => {
      const section = document.getElementById("features");
      if (!section) return;
      const header = document.querySelector("header");
      const headerHeight = header ? header.getBoundingClientRect().height : 0;
      const rect = section.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - headerHeight - 12 + 24;
      window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
    };

    const rafId = window.requestAnimationFrame(() => {
      window.setTimeout(runScroll, 50);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  return null;
}
