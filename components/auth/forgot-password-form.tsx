"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const inputStyles = cn(
  "w-full px-4 py-2.5 rounded-lg bg-bg-high/50 border border-border-ghost",
  "text-body-sm text-text-primary placeholder:text-text-muted",
  "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
  "transition-all duration-200"
);

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="bg-bg-container border border-border-ghost rounded-lg w-full p-8 flex flex-col items-center gap-6 text-center">
        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-heading-md font-heading font-bold text-text-primary">
            Check your email
          </h2>
          <p className="text-body-sm text-text-secondary">
            If an account exists for that email, we sent a password reset link.
            Check your inbox and follow the link to reset your password.
          </p>
        </div>
        <Link href="/login" className="w-full">
          <Button variant="secondary" size="default" className="w-full">
            Back to Log In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-bg-container border border-border-ghost rounded-lg w-full p-8 flex flex-col gap-6">
      <div className="text-center space-y-1">
        <h1 className="text-heading-md font-heading font-bold text-text-primary">
          Forgot your password?
        </h1>
        <p className="text-body-sm text-text-secondary">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-body-sm font-medium text-text-secondary">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputStyles}
          />
        </div>

        {error && (
          <p className="text-body-sm text-[#ef4444]">{error}</p>
        )}

        <Button type="submit" variant="primary" size="default" className="w-full" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>

      <p className="text-center text-body-sm text-text-secondary">
        Remember your password?{" "}
        <Link href="/login" className="text-accent hover:text-accent-hover transition-colors font-medium">
          Log in
        </Link>
      </p>
    </div>
  );
}
