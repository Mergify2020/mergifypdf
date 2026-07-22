// src/components/LogoMerge.tsx
"use client";

import Image from "next/image";

export default function LogoMerge({ size = 80 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center animate-spin"
      // 👇 Tailwind's built-in spinner, with manual duration override
      style={{
        width: size,
        height: size,
        animationDuration: "2s", // smooth, slower spin
        animationDirection: "reverse",
      }}
      aria-hidden
    >
      <Image
        src="/logo5.svg"
        width={size}
        height={size}
        alt="MergifyPDF logo"
        className="block h-full w-full select-none"
        draggable={false}
      />
    </div>
  );
}
