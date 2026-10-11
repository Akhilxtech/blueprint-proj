
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["atypical-scroll-festival.ngrok-free.dev"],

  experimental: {
    agentFeedback: true,
  },

  cacheComponents: true,
  partialPrefetching: true,

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
