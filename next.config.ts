import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Prevent Next.js from trying to bundle the native "canvas" library
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
      "pdfjs-dist/build/pdf.worker": false,
    };
    return config;
  },
};

export default nextConfig;
