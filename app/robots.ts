import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://theparticlepost.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/login/", "/signup/", "/forgot-password/", "/reset-password/", "/profile/", "/settings/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
