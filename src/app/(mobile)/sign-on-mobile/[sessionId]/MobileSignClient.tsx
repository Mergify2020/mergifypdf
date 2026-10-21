"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };
type SessionStatus = "checking" | "ready" | "unavailable";

function wasCompletedOnThisDevice(sessionId: string) {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(`mpdf:completed-sign-session:${sessionId}`) === "true";
  } catch {
    return false;
  }
}

export default function MobileSignClient({ sessionId }: { sessionId: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPointRef = useRef<Point | null>(null);
  const signatureStrokesRef = useRef<Point[][]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [isLandscape, setIsLandscape] = useState<boolean | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("checking");
  const verifiedSessionIdRef = useRef<string | null>(null);
  const sessionVerificationIdRef = useRef(0);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ratio = window.devicePixelRatio || 1;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    if (width === 0 || height === 0) return;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  useEffect(() => {
    const updateOrientation = () => {
      setIsLandscape(window.matchMedia("(orientation: landscape)").matches);
    };
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  useEffect(() => {
    if (wasCompletedOnThisDevice(sessionId)) {
      setSaved(true);
      setSessionStatus("ready");
      return;
    }

    const verifySession = async () => {
      const verificationId = ++sessionVerificationIdRef.current;
      setSessionStatus("checking");
      try {
        const response = await fetch(`/api/sign-session/mobile/${sessionId}`, { cache: "no-store" });
        if (!response.ok) {
          if (verificationId === sessionVerificationIdRef.current) {
            if (wasCompletedOnThisDevice(sessionId)) {
              setSaved(true);
              setSessionStatus("ready");
            } else {
              setSessionStatus("unavailable");
            }
          }
          return;
        }
        if (verificationId !== sessionVerificationIdRef.current) return;
        setSessionStatus("ready");
      } catch {
        if (verificationId === sessionVerificationIdRef.current) {
          if (wasCompletedOnThisDevice(sessionId)) {
            setSaved(true);
            setSessionStatus("ready");
          } else {
            setSessionStatus("unavailable");
          }
        }
      }
    };

    if (verifiedSessionIdRef.current !== sessionId) {
      verifiedSessionIdRef.current = sessionId;
      void verifySession();
    }
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void verifySession();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [sessionId]);

  useEffect(() => {
    if (!isLandscape) return;
    resizeCanvas();
  }, [isLandscape, resizeCanvas]);

  useEffect(() => {
    if (!isLandscape || hasSignature) return;
    const updateCanvasSize = () => resizeCanvas();
    const visualViewport = window.visualViewport;
    window.addEventListener("resize", updateCanvasSize);
    visualViewport?.addEventListener("resize", updateCanvasSize);
    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      visualViewport?.removeEventListener("resize", updateCanvasSize);
    };
  }, [hasSignature, isLandscape, resizeCanvas]);

  useEffect(() => {
    const isActiveSigningScreen = sessionStatus === "ready" && (saved || isLandscape);
    if (!isActiveSigningScreen) return;

    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousRootHeight = root.style.height;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyHeight = body.style.height;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;

    root.style.overflow = "hidden";
    root.style.height = "100%";
    body.style.overflow = "hidden";
    body.style.height = "100%";
    body.style.overscrollBehavior = "none";

    return () => {
      root.style.overflow = previousRootOverflow;
      root.style.height = previousRootHeight;
      body.style.overflow = previousBodyOverflow;
      body.style.height = previousBodyHeight;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
    };
  }, [isLandscape, saved, sessionStatus]);

  useEffect(() => {
    if (!isLandscape || hasSignature) return;
    const parent = canvasRef.current?.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [hasSignature, isLandscape, resizeCanvas]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setIsDrawing(true);
    setHasSignature(true);
    lastPointRef.current = { x, y };
    signatureStrokesRef.current.push([{ x: (x / rect.width) * 1000, y: (y / rect.height) * 400 }]);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pointerEvents = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];

      for (const pointerEvent of pointerEvents) {
        const x = pointerEvent.clientX - rect.left;
        const y = pointerEvent.clientY - rect.top;
        const last = lastPointRef.current;
        if (!last) {
          ctx.moveTo(x, y);
          lastPointRef.current = { x, y };
          continue;
        }
        const midX = (last.x + x) / 2;
        const midY = (last.y + y) / 2;
        ctx.quadraticCurveTo(last.x, last.y, midX, midY);
        ctx.stroke();
        signatureStrokesRef.current.at(-1)?.push({ x: (x / rect.width) * 1000, y: (y / rect.height) * 400 });
        lastPointRef.current = { x, y };
      }
    },
    [isDrawing]
  );

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    setIsDrawing(false);
    lastPointRef.current = null;
  }, []);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    resizeCanvas();
    signatureStrokesRef.current = [];
    setSaved(false);
    setError(null);
    setHasSignature(false);
  }, [resizeCanvas]);

  const handleSave = useCallback(async () => {
    if (!sessionId) {
      setError("Missing session.");
      return;
    }
    if (!hasSignature) {
      setError("Draw your signature before saving.");
      return;
    }
    const paths = signatureStrokesRef.current
      .filter((stroke) => stroke.length > 0)
      .map((stroke) => {
        if (stroke.length === 1) {
          const point = stroke[0];
          return `<circle cx="${point.x}" cy="${point.y}" r="3.6" fill="#0f172a" stroke="none" />`;
        }
        let path = `M ${stroke[0].x} ${stroke[0].y}`;
        for (let index = 1; index < stroke.length; index += 1) {
          const previous = stroke[index - 1];
          const current = stroke[index];
          path += ` Q ${previous.x} ${previous.y} ${(previous.x + current.x) / 2} ${(previous.y + current.y) / 2}`;
        }
        const lastPoint = stroke[stroke.length - 1];
        return `<path d="${path} L ${lastPoint.x} ${lastPoint.y}" />`;
      })
      .join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 400" fill="none" stroke="#0f172a" stroke-width="7.2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
    const dataUrl = `data:image/svg+xml;base64,${window.btoa(svg)}`;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sign-session/mobile/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, name: "Mobile signature" }),
        cache: "no-store",
      });
      if (res.status === 409) {
        try {
          window.sessionStorage.setItem(`mpdf:completed-sign-session:${sessionId}`, "true");
        } catch {
          // The server remains the source of truth for completed requests.
        }
        setSaved(true);
        return;
      }
      if (res.status === 404) {
        setSessionStatus("unavailable");
        return;
      }
      if (!res.ok) throw new Error("Could not save signature.");
      try {
        window.sessionStorage.setItem(`mpdf:completed-sign-session:${sessionId}`, "true");
      } catch {
        // The server remains the source of truth for completed requests.
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }, [hasSignature, sessionId]);

  if (!saved && (isLandscape === null || sessionStatus === "checking")) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-white px-6">
        <div className="flex flex-col items-center" aria-label="Loading signing screen" role="status">
          <div className="size-12 animate-spin rounded-full border-4 border-[color:var(--spinner-track)] border-t-[color:var(--spinner-head)]" aria-hidden />
        </div>
      </main>
    );
  }

  if (sessionStatus === "unavailable") {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-white px-6 text-slate-950">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold tracking-tight">This signing request is closed</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Return to your computer to continue.</p>
        </div>
      </main>
    );
  }

  const showRotatePrompt = !isLandscape;
  const isPortraitPrompt = !saved && showRotatePrompt;
  const isSigningScreen = !saved && !showRotatePrompt;
  const isSavedScreen = saved;
  const signingViewportStyle = isSigningScreen
    ? {
        height: "100svh",
        paddingTop: "max(8px, env(safe-area-inset-top))",
        paddingBottom: "max(8px, env(safe-area-inset-bottom))",
        paddingInline: "max(12px, env(safe-area-inset-left), env(safe-area-inset-right))",
      }
    : undefined;
  const signingCanvasStyle = { height: "clamp(120px, calc(100svh - 164px), 320px)" };

  return (
    <main
      className={`min-h-[100dvh] text-slate-950 ${isSigningScreen ? "h-[100dvh] min-h-0 overflow-hidden bg-white px-3 py-2 sm:px-4" : isSavedScreen ? "h-[100svh] min-h-0 overflow-hidden bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))] sm:px-6" : isPortraitPrompt ? "bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))] sm:px-6" : "bg-slate-50 px-5 py-4 sm:px-6 sm:py-5"}`}
      style={signingViewportStyle}
    >
      <div
        className={`mx-auto flex w-full flex-col ${isSigningScreen ? "h-full min-h-0 max-w-[900px]" : isSavedScreen ? "h-full min-h-0 max-w-3xl" : isPortraitPrompt ? "min-h-[calc(100dvh-max(40px,calc(env(safe-area-inset-top)+env(safe-area-inset-bottom))))] max-w-3xl" : "min-h-[calc(100dvh-2rem)] max-w-3xl"}`}
      >
        {!isPortraitPrompt && !isSigningScreen && !isSavedScreen ? (
          <header className="flex items-center justify-between gap-4">
            <Image src="/logos/logo-icontext-dark-v4.svg" alt="MergifyPDF" width={145} height={28} className="h-7 w-auto" priority />
          </header>
        ) : null}

        <section className={isSigningScreen ? "flex min-h-0 flex-1 py-0" : isSavedScreen ? "flex min-h-0 flex-1 items-center justify-center py-8" : `my-auto ${isPortraitPrompt ? "py-8" : "py-5 sm:py-7"}`}>
          <div className={isSigningScreen ? "flex min-h-0 flex-1 flex-col" : isPortraitPrompt || isSavedScreen ? "" : "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"}>
            {saved ? (
              <div className="py-9 text-center sm:py-12">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24" fill="none"><path d="m5 12.5 4.2 4.2L19.5 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <h1 className="mt-4 text-xl font-semibold tracking-tight">Signature saved</h1>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">To create another signature, start a new request.</p>
              </div>
            ) : showRotatePrompt ? (
              <div className="mx-auto w-full max-w-[320px] text-center">
                <div className="mx-auto flex aspect-[1.5] w-full items-center justify-center">
                  <Image src="/illustrations/rotate-phone-signing.png" alt="Phone rotating to landscape for signing" width={240} height={240} className="block h-full w-full object-contain" unoptimized />
                </div>
                <h1 className="mt-6 text-[26px] font-semibold tracking-tight text-slate-950">Rotate your phone to continue</h1>
                <p className="mx-auto mt-2 max-w-[280px] text-sm leading-6 text-slate-500">Landscape gives you more room to sign comfortably.</p>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col justify-center">
                <div className="flex items-center justify-between gap-3">
                  <h1 className="text-xl font-semibold tracking-tight text-slate-950">Sign here</h1>
                  <button type="button" onClick={handleClear} className="flex h-10 shrink-0 items-center justify-center rounded-md px-3 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
                    Clear
                  </button>
                </div>

                <div className="mt-2.5 shrink-0 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-1.5" style={signingCanvasStyle}>
                  <div className="relative h-full min-h-0 overflow-hidden rounded-lg border border-slate-100 bg-white">
                    <canvas
                      ref={canvasRef}
                      aria-label="Signature drawing area"
                      className="relative block w-full touch-none bg-transparent"
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                    />
                    {!hasSignature ? (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8">
                        <svg aria-hidden="true" className="h-32 w-full max-w-xl text-[#245B92] opacity-45" viewBox="0 0 180 56" fill="none">
                          <path d="M8 36c18 5 20-25 31-17 9 7-5 22 5 18 14-7 19-28 28-22 8 5-5 23 5 21 13-2 13-21 24-20 10 1 2 20 13 20 12 0 17-16 25-13 7 3 0 13 10 14 14 2 20-8 29-17 9-9 18-8 22 2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M14 45h150" stroke="currentColor" strokeOpacity=".18" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                    ) : null}
                  </div>
                </div>

                {error ? <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

                <button type="button" className="mt-2.5 flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:bg-violet-300" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <svg aria-hidden="true" className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                      Saving signature...
                    </>
                  ) : (
                    <>
                      Save signature
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
