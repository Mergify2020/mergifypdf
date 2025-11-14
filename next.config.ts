import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

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
      { source: "/favicon2026.svg", headers: noCacheHeaders },
      { source: "/favicon-32-2026.png", headers: noCacheHeaders },
      { source: "/favicon-16-2026.png", headers: noCacheHeaders },
      { source: "/apple-touch-icon-2026.png", headers: noCacheHeaders },
      { source: "/safari-pinned-tab-2026.svg", headers: noCacheHeaders },
    ];
  },

  turbopack: {},
};

export default nextConfig;
