// src/components/LogoMerge.tsx
"use client";

export default function LogoMerge({ size = 80 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center animate-spin"
      // 👇 Tailwind's built-in spinner, with manual duration override
      style={{
        width: size,
        height: size,
        animationDuration: "2s", // smooth, slower spin
      }}
      aria-hidden
    >
      <img
        src="/logo4.svg"
        alt="MergifyPDF logo"
        className="block w-full h-full select-none"
        draggable={false}
      />
    </div>
  );
}
