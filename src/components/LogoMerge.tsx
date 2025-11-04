// src/components/LogoMerge.tsx
"use client";

export default function LogoMerge({ size = 80 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center animate-spin-slow"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <img
        src="/logo2.svg"
        alt="MergifyPDF logo"
        className="w-full h-full select-none"
        draggable={false}
      />
    </div>
  );
}
