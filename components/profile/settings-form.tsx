"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type FormState = "idle" | "loading" | "success" | "error";

interface SettingsFormProps {
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
    created_at: string;
  };
}

const inputStyles = cn(
  "flex-1 px-4 py-2.5 rounded-lg bg-bg-tertiary/50 border border-[var(--border)]",
  "text-body-sm text-foreground placeholder:text-foreground-muted",
  "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
  "transition-all duration-200"
);

function StatusMessage({ state, message }: { state: FormState; message: string }) {
  if (state === "idle" || state === "loading" || !message) return null;

  return (
    <p
      className={cn(
        "text-body-xs mt-2",
        state === "success" && "text-accent",
        state === "error" && "text-danger"
      )}
    >
      {state === "success" && (
        <svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {message}
    </p>
  );
}

export function SettingsForm({ profile }: SettingsFormProps) {
  // --- Profile section state ---
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [profileState, setProfileState] = useState<FormState>("idle");
  const [profileMessage, setProfileMessage] = useState("");

  // --- Password section state ---
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordState, setPasswordState] = useState<FormState>("idle");
  const [passwordMessage, setPasswordMessage] = useState("");

  // --- Linked accounts state ---
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);

  function resetAfterDelay(
    setStateFn: (s: FormState) => void,
    setMsgFn: (m: string) => void
  ) {
    setTimeout(() => {
      setStateFn("idle");
      setMsgFn("");
    }, 5000);
  }

  // --- Profile submit ---
  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileState("loading");
    setProfileMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          avatar_url: avatarUrl.trim() || null,
        })
        .eq("id", profile.id);

      if (error) {
        setProfileState("error");
        setProfileMessage(error.message);
      } else {
        setProfileState("success");
        setProfileMessage("Profile updated successfully.");
      }
    } catch {
      setProfileState("error");
      setProfileMessage("Network error. Please try again.");
    }

    resetAfterDelay(setProfileState, setProfileMessage);
  };

  // --- Password submit ---
  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordState("loading");
    setPasswordMessage("");

    if (newPassword.length < 6) {
      setPasswordState("error");
      setPasswordMessage("Password must be at least 6 characters.");
      resetAfterDelay(setPasswordState, setPasswordMessage);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordState("error");
      setPasswordMessage("Passwords do not match.");
      resetAfterDelay(setPasswordState, setPasswordMessage);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordState("error");
        setPasswordMessage(error.message);
      } else {
        setPasswordState("success");
        setPasswordMessage("Password updated successfully.");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordState("error");
      setPasswordMessage("Network error. Please try again.");
    }

    resetAfterDelay(setPasswordState, setPasswordMessage);
  };

  // --- Link identity ---
  const handleLinkIdentity = async (provider: "google" | "github") => {
    setLinkingProvider(provider);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.linkIdentity({ provider });
      if (error) {
        console.error(`Failed to link ${provider}:`, error.message);
      }
    } catch {
      console.error(`Failed to link ${provider}`);
    } finally {
      setLinkingProvider(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Profile */}
      <section className="glass-card rounded-xl p-6">
        <h2 className="text-body-lg font-semibold text-foreground mb-4">
          Profile
        </h2>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="fullName"
              className="block text-body-sm font-medium text-foreground-secondary mb-1.5"
            >
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className={cn(inputStyles, "w-full")}
              disabled={profileState === "loading"}
            />
          </div>
          <div>
            <label
              htmlFor="avatarUrl"
              className="block text-body-sm font-medium text-foreground-secondary mb-1.5"
            >
              Avatar URL
            </label>
            <input
              id="avatarUrl"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className={cn(inputStyles, "w-full")}
              disabled={profileState === "loading"}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={profileState === "loading"}
            >
              {profileState === "loading" ? "Saving..." : "Save"}
            </Button>
            <StatusMessage state={profileState} message={profileMessage} />
          </div>
        </form>
      </section>

      {/* Section 2: Change Password */}
      <section className="glass-card rounded-xl p-6">
        <h2 className="text-body-lg font-semibold text-foreground mb-4">
          Change Password
        </h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="newPassword"
              className="block text-body-sm font-medium text-foreground-secondary mb-1.5"
            >
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              minLength={6}
              required
              className={cn(inputStyles, "w-full")}
              disabled={passwordState === "loading"}
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-body-sm font-medium text-foreground-secondary mb-1.5"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              minLength={6}
              required
              className={cn(inputStyles, "w-full")}
              disabled={passwordState === "loading"}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={passwordState === "loading"}
            >
              {passwordState === "loading" ? "Updating..." : "Update Password"}
            </Button>
            <StatusMessage state={passwordState} message={passwordMessage} />
          </div>
        </form>
      </section>

      {/* Section 3: Connected Accounts */}
      <section className="glass-card rounded-xl p-6">
        <h2 className="text-body-lg font-semibold text-foreground mb-4">
          Connected Accounts
        </h2>
        <p className="text-body-sm text-foreground-secondary mb-4">
          Link external accounts for easier sign-in.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => handleLinkIdentity("google")}
            disabled={linkingProvider !== null}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
            </svg>
            {linkingProvider === "google" ? "Linking..." : "Link Google Account"}
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => handleLinkIdentity("github")}
            disabled={linkingProvider !== null}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
            </svg>
            {linkingProvider === "github" ? "Linking..." : "Link GitHub Account"}
          </Button>
        </div>
      </section>
    </div>
  );
}
