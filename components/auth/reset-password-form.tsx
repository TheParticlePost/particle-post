"use client";

import { useState } from "react";
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

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/login?message=Password+updated+successfully");
    router.refresh();
  }

  return (
    <div className="bg-bg-container border border-border-ghost rounded-lg w-full p-8 flex flex-col gap-6">
      <div className="text-center space-y-1">
        <h1 className="text-heading-md font-heading font-bold text-text-primary">
          Reset your password
        </h1>
        <p className="text-body-sm text-text-secondary">
          Enter your new password below
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-body-sm font-medium text-text-secondary">
            New Password
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
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Repeat your new password"
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
          {loading ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </div>
  );
}
