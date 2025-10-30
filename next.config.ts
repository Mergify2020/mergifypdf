import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    return config;
  },
  turbopack: {}, // tells Next.js Turbopack is configured, silences warning
};

export default nextConfig;
