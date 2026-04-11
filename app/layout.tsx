import type { Metadata } from "next";
import { sora, dmSans, ibmPlexMono } from "@/lib/fonts";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { CookieConsent } from "@/components/analytics/cookie-consent";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { TAGLINE_LONG } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Particle Post | AI Briefings for Business Leaders",
    template: "%s | Particle Post",
  },
  description: TAGLINE_LONG,
  metadataBase: new URL("https://theparticlepost.com"),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://theparticlepost.com",
    siteName: "Particle Post",
    title: "Particle Post",
    description: TAGLINE_LONG,
    images: [{ url: "/og-image.svg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Particle Post",
    description:
      "Twice-daily AI briefings for business leaders.",
  },
  robots: {
    index: true,
    follow: true,
  },
  // Google Search Console verification — set GOOGLE_SITE_VERIFICATION in
  // Vercel env vars after registering the property in GSC. Falls back to
  // undefined (no meta tag) if not set, so local dev / preview deployments
  // don't trip on a missing env var.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sora.variable} ${dmSans.variable} ${ibmPlexMono.variable}`}
    >
      <body className="font-body bg-bg-base text-text-body antialiased min-h-screen">
        <ThemeProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <ScrollToTop />
            <CookieConsent />
          </div>
          <GoogleAnalytics />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
