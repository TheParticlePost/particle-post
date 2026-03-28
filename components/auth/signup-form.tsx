"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { validatePassword } from "@/lib/validate-password";
import { cn } from "@/lib/utils";

const inputStyles = cn(
  "w-full px-4 py-2.5 rounded-lg bg-bg-high/50 border border-border-ghost",
  "text-body-sm text-text-primary placeholder:text-text-muted",
  "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
  "transition-all duration-200"
);

export function SignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const pwError = validatePassword(password, confirmPassword);
    if (pwError) {
      setError(pwError);
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin + "/auth/callback",
      },
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
            We sent a confirmation link to <strong className="text-text-primary">{email}</strong>.
            Click the link to activate your account.
          </p>
        </div>
        <div className="w-full flex flex-col gap-2">
          <Button
            variant="primary"
            size="default"
            className="w-full"
            onClick={() => router.push("/")}
          >
            Go to Homepage
          </Button>
          <Button
            variant="secondary"
            size="default"
            className="w-full"
            onClick={() => router.push("/login")}
          >
            Back to Log In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-container border border-border-ghost rounded-lg w-full p-8 flex flex-col gap-6">
      <div className="text-center space-y-1">
        <h1 className="text-heading-md font-heading font-bold text-text-primary">
          Create an account
        </h1>
        <p className="text-body-sm text-text-secondary">
          Join Particle Post today
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fullName" className="text-body-sm font-medium text-text-secondary">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            placeholder="Jane Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className={inputStyles}
          />
        </div>

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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-body-sm font-medium text-text-secondary">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className={inputStyles}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmPassword" className="text-body-sm font-medium text-text-secondary">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className={inputStyles}
          />
        </div>

        {error && (
          <p className="text-body-sm text-[#ef4444]">{error}</p>
        )}

        <Button type="submit" variant="primary" size="default" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Sign Up"}
        </Button>
      </form>

      <p className="text-center text-body-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:text-accent-hover transition-colors font-medium">
          Log in
        </Link>
      </p>
    </div>
  );
}
