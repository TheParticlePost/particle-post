"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OverlineLabel } from "@/components/ui/overline-label";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <OverlineLabel className="mb-4 block">Error 500</OverlineLabel>
        <h1 className="font-display text-display-xl text-text-primary mb-4">
          Something went wrong
        </h1>
        <p className="text-body-md text-text-secondary mb-8">
          We encountered an unexpected error. Our team has been notified.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button variant="primary" size="default" onClick={reset}>
            Try again
          </Button>
          <Link href="/">
            <Button variant="secondary" size="default">
              Back to home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
