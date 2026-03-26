import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  trailingSlash: true,
  headers: async () => [
    { source: "/(.*)", headers: securityHeaders },
  ],
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
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
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
