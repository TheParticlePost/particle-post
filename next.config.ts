import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  redirects: async () => [
    {
      source: "/index.xml",
      destination: "/feed.xml/",
      permanent: true,
    },
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "cdn.pixabay.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // Empty turbopack config to allow Turbopack (Next.js 16 default)
  turbopack: {},
  // Exclude pipeline/blog directories from Next.js compilation
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/pipeline/**", "**/cloudflare-worker/**", "**/TODO/**"],
    };
    return config;
  },
};

export default nextConfig;
