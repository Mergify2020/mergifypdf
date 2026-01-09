"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Point = { x: number; y: number };

export default function MobileSignClient({ sessionId }: { sessionId: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPointRef = useRef<Point | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ratio = window.devicePixelRatio || 1;
    const width = parent.clientWidth;
    const height = 260;
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
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [resizeCanvas]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setIsDrawing(true);
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
  }, [resizeCanvas]);

  const handleSave = useCallback(async () => {
    if (!sessionId) {
      setError("Missing session.");
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
        body: JSON.stringify({ dataUrl, name: name.trim() || "Mobile signature" }),
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Could not save signature.");
      }
      setSaved(true);
      setTimeout(() => {
        window.location.href = "/"; // invalidate this window after save
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }, [name, sessionId]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Draw signature</h1>
            <p className="text-sm text-slate-200/80">Rotate your phone, draw, then save to sync back to desktop.</p>
          </div>
          <Link href="/" className="text-sm text-slate-200 underline underline-offset-4">
            Exit
          </Link>
        </div>
        <div className="mt-5 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5"
                onClick={handleClear}
              >
                Clear
              </button>
              <button
                type="button"
                className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 disabled:opacity-50"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : saved ? "Saved" : "Save"}
              </button>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name (optional)"
                className="ml-auto h-10 w-48 rounded-lg border border-white/10 bg-white/10 px-3 text-sm font-semibold text-white placeholder:text-white/60 outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20"
              />
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
              <canvas
                ref={canvasRef}
                className="h-[260px] w-full touch-none bg-white"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-200/80">
            Tip: Use landscape mode for more space. Saving syncs instantly to your desktop session.
          </div>
          {error ? <div className="mt-3 rounded-lg bg-rose-500/20 px-3 py-2 text-sm text-rose-100">{error}</div> : null}
          {saved ? (
            <div className="mt-3 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm text-emerald-100">
              Saved. Return to your desktop to place it.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
