import LogoMerge from "@/components/LogoMerge";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-white/90 backdrop-blur">
      <div className="flex flex-col items-center gap-3">
        <LogoMerge size={72} />
        <p className="text-sm text-gray-600">Loading…</p>
      </div>
    </div>
  );
}
