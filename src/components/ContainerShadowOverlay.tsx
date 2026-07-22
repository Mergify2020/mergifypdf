"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Rect = { top: number; left: number; width: number; height: number };

function isVisiblePanel(panel: HTMLElement) {
  const rect = panel.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle(panel);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

export default function ContainerShadowOverlay({
  targetId,
  radius = 32,
  overlayZIndex = 55,
}: {
  targetId: string;
  radius?: number;
  overlayZIndex?: number;
}) {
  const [active, setActive] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);

  const media = useMemo(() => {
    if (typeof window === "undefined") return null;
    return window.matchMedia("(max-width: 1399px)");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let raf = 0;
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    const target = document.getElementById(targetId);
    if (!target) return;

    const update = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const panel = document.querySelector<HTMLElement>('[data-workspace-secondary-panel="true"]');
        const modalOpen = document.body?.dataset?.modalOpen === "true";
        const shouldEnable = !modalOpen && Boolean(media?.matches) && Boolean(panel && isVisiblePanel(panel));

        if (shouldEnable) {
          target.dataset.shadowOverlay = "true";
        } else {
          delete target.dataset.shadowOverlay;
        }

        setActive(shouldEnable);
        const nextRect = target.getBoundingClientRect();
        setRect({
          top: Math.round(nextRect.top),
          left: Math.round(nextRect.left),
          width: Math.round(nextRect.width),
          height: Math.round(nextRect.height),
        });
      });
    };

    update();

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    media?.addEventListener("change", update);

    resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(target);

    mutationObserver = new MutationObserver(update);
    mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      media?.removeEventListener("change", update);
      if (raf) cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      delete target.dataset.shadowOverlay;
    };
  }, [media, targetId]);

  if (!active || !rect || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-hidden="true"
      className="pointer-events-none fixed border border-slate-200/70 shadow-[0_18px_50px_rgba(15,23,42,0.10)]"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        borderRadius: radius,
        zIndex: overlayZIndex,
      }}
    />,
    document.body,
  );
}
