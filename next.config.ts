import type { NextConfig } from "next";

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.pexels.com https://cdn.pixabay.com https://images.unsplash.com https://*.supabase.co https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
  "connect-src 'self' https://*.supabase.co https://vitals.vercel-insights.com https://www.google-analytics.com https://cdn.jsdelivr.net",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
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
    {
      // The /authors/william-hayes/ URL was live in production from
      // commit 20d2f26 (the author registry rollout). After the curator
      // rename to William Morin, preserve any inbound links / cached
      // search results with a permanent redirect.
      source: "/authors/william-hayes/",
      destination: "/authors/william-morin/",
      permanent: true,
    },
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "cdn.pixabay.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "uzgywmjexciknmpbebqs.supabase.co" },
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
      ignored: ["**/pipeline/**", "**/TODO/**"],
    };
    return config;
  },
};

export default nextConfig;
