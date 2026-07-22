import type { NextConfig } from "next";
import createBundleAnalyzer from "@next/bundle-analyzer";
import { assertRuntimeEnvironmentSafe } from "./src/lib/runtimeEnvironment";

assertRuntimeEnvironmentSafe(process.env);

const shouldLimitCpus = process.env.CI === "1" || process.env.CI === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    webpackMemoryOptimizations: true,
    ...(shouldLimitCpus ? { cpus: 1, webpackBuildWorker: true } : {}),
  },
  turbopack: {
    resolveAlias: {
      canvas: "./src/lib/emptyModule.ts",
      "pdfjs-dist/build/pdf.worker": "./src/lib/emptyModule.ts",
      "pdfjs-dist/legacy/build/pdf.worker": "./src/lib/emptyModule.ts",
    },
  },
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "::1",
    "172.30.190.27",
    "10.0.0.163",
    "0.0.0.0",
    "*.app.github.dev",
  ],

  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
      "pdfjs-dist/build/pdf.worker": false,
      "pdfjs-dist/legacy/build/pdf.worker": false,
    };
    return config;
  },

  // ✅ Disable caching for all favicon variants (Safari + iOS)
  async headers() {
    const noCacheHeaders = [
      { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
      { key: "Pragma", value: "no-cache" },
      { key: "Expires", value: "0" },
    ];

    return [
      { source: "/favicon2080.svg", headers: noCacheHeaders },
      { source: "/favicon-32-2080.png", headers: noCacheHeaders },
      { source: "/favicon-16-2080.png", headers: noCacheHeaders },
      { source: "/apple-touch-icon-2080.png", headers: noCacheHeaders },
      { source: "/safari-pinned-tab-2080.svg", headers: noCacheHeaders },
    ];
  },

};

const withBundleAnalyzer = createBundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

export default withBundleAnalyzer(nextConfig);
