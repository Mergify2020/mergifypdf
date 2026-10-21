"use client";

const HMR_PROBE_VERSION = "baseline";

export default function DevHmrProbe() {
  if (process.env.NODE_ENV === "production") return null;
  return <span data-dev-hmr-probe hidden>{HMR_PROBE_VERSION}</span>;
}
