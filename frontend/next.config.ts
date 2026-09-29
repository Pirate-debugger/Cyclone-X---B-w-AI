import type { NextConfig } from "next";

const backendUrl = (process.env.INTERNAL_BACKEND_URL || process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, '');

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ['maplibre-gl', 'pmtiles'],
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
