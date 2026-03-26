import type { Metadata } from "next";
import { instrumentSerif, dmSans, jetbrainsMono } from "@/lib/fonts";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { CookieConsent } from "@/components/analytics/cookie-consent";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Particle Post",
    template: "%s | Particle Post",
  },
  description:
    "AI-powered insights at the intersection of finance, technology, and energy. Deep analysis on fintech, risk management, and enterprise innovation.",
  metadataBase: new URL("https://theparticlepost.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Particle Post",
    title: "Particle Post",
    description:
      "AI-powered insights at the intersection of finance, technology, and energy.",
    images: [{ url: "/og-image.svg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Particle Post",
    description:
      "AI-powered insights at the intersection of finance, technology, and energy.",
  },
  robots: {
    index: true,
    follow: true,
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
      className={`${instrumentSerif.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-body bg-bg-primary text-foreground antialiased min-h-screen">
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
        </ThemeProvider>
      </body>
    </html>
  );
}
