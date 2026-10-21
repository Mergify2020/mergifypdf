"use client";

const STUDIO_HMR_PROBE_VERSION = "baseline";

export default function StudioHmrProbe() {
  if (process.env.NODE_ENV === "production") return null;
  return <span data-studio-hmr-probe hidden>{STUDIO_HMR_PROBE_VERSION}</span>;
}
