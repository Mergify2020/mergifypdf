"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };

export default function MobileSignClient({ sessionId }: { sessionId: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPointRef = useRef<Point | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ratio = window.devicePixelRatio || 1;
    const width = parent.clientWidth;
    const height = 280;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  useEffect(() => {
    const updateOrientation = () => setIsLandscape(window.matchMedia("(orientation: landscape)").matches);
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  useEffect(() => {
    if (!isLandscape) return;
    resizeCanvas();
  }, [isLandscape, resizeCanvas]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setIsDrawing(true);
    setHasSignature(true);
    lastPointRef.current = { x, y };
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
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const last = lastPointRef.current;
      if (!last) {
        ctx.moveTo(x, y);
        lastPointRef.current = { x, y };
        return;
      }
      const midX = (last.x + x) / 2;
      const midY = (last.y + y) / 2;
      ctx.quadraticCurveTo(last.x, last.y, midX, midY);
      ctx.stroke();
      lastPointRef.current = { x, y };
    },
    [isDrawing]
  );

  const handlePointerUp = useCallback(() => {
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sign-session/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, name: "Mobile signature" }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Could not save signature.");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }, [hasSignature, sessionId]);

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-4 py-5 text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-xl">
        <header className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-bold text-white shadow-sm">M</div>
          <span className="text-base font-semibold tracking-tight">MergifyPDF</span>
        </header>

        <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
          {saved ? (
            <div className="py-10 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-violet-100 text-2xl font-semibold text-violet-700">✓</div>
              <h1 className="mt-5 text-xl font-semibold tracking-tight">Signature sent</h1>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">Your signature is ready on your desktop. You can return to this device when you need it again.</p>
            </div>
          ) : !isLandscape ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-violet-50 text-3xl text-violet-600">↻</div>
              <h1 className="mt-5 text-xl font-semibold tracking-tight">Rotate your phone</h1>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">Turn your phone sideways to draw your signature with enough room.</p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="text-sm font-medium text-violet-600">Mobile signing</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">Draw your signature</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">Use your finger to sign in the space below.</p>
              </div>

              <div className="relative mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner">
                <canvas
                  ref={canvasRef}
                  aria-label="Signature drawing area"
                  className="h-[280px] w-full touch-none bg-white"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                />
                {!hasSignature ? <div className="pointer-events-none absolute inset-x-7 bottom-12 border-b border-dashed border-slate-300" /> : null}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-slate-400">Sign naturally with your finger.</p>
                <button type="button" onClick={handleClear} className="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">Clear</button>
              </div>

              {error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p> : null}

              <button type="button" className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300" onClick={handleSave} disabled={saving}>
                {saving ? "Saving signature..." : "Save signature"}
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
