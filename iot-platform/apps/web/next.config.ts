import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,

  // Enable standalone output for Docker deployment
  output: 'standalone',
};

export default nextConfig;
