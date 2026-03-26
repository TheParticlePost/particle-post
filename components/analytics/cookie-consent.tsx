"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("cookie-consent");
    if (!stored) {
      // Delay showing to not block initial render
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    window.dispatchEvent(new Event("cookie-consent-updated"));
    setShow(false);
  };

  const decline = () => {
    localStorage.setItem("cookie-consent", "declined");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50",
        "glass-card p-4 shadow-card animate-slide-up"
      )}
      role="dialog"
      aria-label="Cookie consent"
    >
      <p className="text-body-sm text-foreground-secondary mb-3">
        We use cookies to improve your experience and analyze site usage.
      </p>
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={accept}>
          Accept
        </Button>
        <Button variant="ghost" size="sm" onClick={decline}>
          Decline
        </Button>
      </div>
    </div>
  );
}
