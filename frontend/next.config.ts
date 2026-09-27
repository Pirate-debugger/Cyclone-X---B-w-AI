import type { NextConfig } from "next";

const backendUrl = (process.env.INTERNAL_BACKEND_URL || process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, '');

const nextConfig: NextConfig = {
  output: "standalone",
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
