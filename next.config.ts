import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    cpus: 1,
  },
  turbopack: {},
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://172.30.190.27:3000",
    "http://10.0.0.163:3000",
    "http://10.0.0.163",
    "http://0.0.0.0:3000",
    "10.0.0.163:3000",
    "10.0.0.163",
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

export default nextConfig;
