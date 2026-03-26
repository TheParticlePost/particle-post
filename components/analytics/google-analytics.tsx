"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function GoogleAnalytics() {
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cookie-consent");
    if (stored === "accepted") setConsent(true);

    const handler = () => {
      const updated = localStorage.getItem("cookie-consent");
      if (updated === "accepted") setConsent(true);
    };
    window.addEventListener("storage", handler);
    // Listen for custom consent event
    window.addEventListener("cookie-consent-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("cookie-consent-updated", handler);
    };
  }, []);

  if (!GA_ID || !consent) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}
