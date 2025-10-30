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
  // Present an empty turbopack config so Next 16 doesn't complain,
  // but we still build with Webpack (see package.json "build --webpack")
  turbopack: {},
};

export default nextConfig;
