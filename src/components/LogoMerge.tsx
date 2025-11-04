"use client";

export default function LogoMerge({ size = 64 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Square 1 – top-left */}
      <div
        className="absolute bg-brand rounded-md animate-squareA shadow-sm"
        style={{
          width: size * 0.45,
          height: size * 0.45,
        }}
      />

      {/* Square 2 – bottom-right */}
      <div
        className="absolute bg-brand/80 rounded-md animate-squareB shadow-sm"
        style={{
          width: size * 0.45,
          height: size * 0.45,
        }}
      />
    </div>
  );
}
