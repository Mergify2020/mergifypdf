import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  webpack: (config) => {
    // Make sure `canvas` (a native module) is never bundled.
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
      "pdfjs-dist/build/pdf.worker": false,
      "pdfjs-dist/legacy/build/pdf.worker": false,
    };
    return config;
  },

  // ✅ Add custom headers to prevent favicon caching
  async headers() {
    return [
      {
        source: "/:path*favicon.:ext(svg|png|ico)", // Match favicon files
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },

  // Present an empty turbopack config so Next 16 doesn't complain,
  // but we still build with Webpack (see package.json "build --webpack")
  turbopack: {},
};

export default nextConfig;
