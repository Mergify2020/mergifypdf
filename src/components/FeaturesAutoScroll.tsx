"use client";

import { useEffect } from "react";

export default function FeaturesAutoScroll() {
  useEffect(() => {
    const shouldScroll = window.location.hash === "#features";

    try {
      if (window.sessionStorage.getItem("skipFeatureAutoScroll") === "1") {
        window.sessionStorage.removeItem("skipFeatureAutoScroll");
        return;
      }
    } catch {
      // no-op
    }

    if (!shouldScroll) return;

    const runScroll = () => {
      const section = document.getElementById("features");
      if (!section) return;
      const header = document.querySelector("header");
      const headerHeight = header ? header.getBoundingClientRect().height : 0;
      const rect = section.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - headerHeight - 12 + 24;
      window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
      // Clear the hash after we handle the one-time jump so reload doesn't force-scroll again.
      if (window.location.hash === "#features") {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
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
