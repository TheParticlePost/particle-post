"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const errorDescription =
    searchParams.get("error_description") ||
    searchParams.get("error") ||
    "An unexpected authentication error occurred. Please try again.";

  return (
    <div className="glass-card w-full p-8 text-center flex flex-col items-center gap-6">
      <div className="w-12 h-12 rounded-full bg-[#ef4444]/10 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6 text-[#ef4444]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div className="space-y-2">
        <h1 className="text-heading-md font-heading font-bold text-foreground">
          Authentication Error
        </h1>
        <p className="text-body-sm text-foreground-secondary">{errorDescription}</p>
      </div>
      <Link href="/login" className="w-full">
        <Button variant="primary" size="md" className="w-full">
          Back to Log In
        </Button>
      </Link>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="glass-card w-full p-8 text-center">
          <p className="text-body-sm text-foreground-secondary">Loading...</p>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
