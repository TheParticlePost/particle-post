"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  user: {
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
    role?: string | null;
  };
}

function getInitials(fullName?: string | null, email?: string): string {
  if (fullName && fullName.trim()) {
    return fullName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return (email?.[0] ?? "?").toUpperCase();
}

export function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, close]);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Sign out failed — continue with redirect anyway
    }
    close();
    router.push("/");
    router.refresh();
  };

  const initials = getInitials(user.full_name, user.email);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full overflow-hidden",
          "border-2 border-transparent hover:border-accent/50",
          "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        )}
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.full_name ?? "User avatar"}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="flex items-center justify-center w-full h-full bg-accent text-[#0a0a0f] font-semibold text-body-sm">
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-full mt-2 min-w-[200px] z-50",
            "bg-bg-container border border-border-ghost rounded-lg",
            "py-1.5 animate-in fade-in slide-in-from-top-2 duration-150"
          )}
        >
          <div className="px-3 py-2 border-b border-border-ghost">
            <p className="text-body-sm font-medium text-text-primary truncate">
              {user.full_name || "User"}
            </p>
            <p className="text-body-xs text-text-secondary truncate">
              {user.email}
            </p>
          </div>

          <div className="py-1">
            <Link
              href="/profile"
              role="menuitem"
              onClick={close}
              className="flex items-center gap-2 px-3 py-2 text-body-sm text-text-primary hover:bg-bg-high/50 transition-colors"
            >
              <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              Profile
            </Link>
            <Link
              href="/settings"
              role="menuitem"
              onClick={close}
              className="flex items-center gap-2 px-3 py-2 text-body-sm text-text-primary hover:bg-bg-high/50 transition-colors"
            >
              <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              Settings
            </Link>
          </div>

          {user.role === "admin" && (
            <>
              <div className="border-t border-border-ghost my-1" />
              <div className="py-1">
                <Link
                  href="/admin"
                  role="menuitem"
                  onClick={close}
                  className="flex items-center gap-2 px-3 py-2 text-body-sm text-accent hover:bg-bg-high/50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                  </svg>
                  Admin Dashboard
                </Link>
              </div>
            </>
          )}

          <div className="border-t border-border-ghost my-1" />
          <div className="py-1">
            <button
              role="menuitem"
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-3 py-2 text-body-sm text-text-secondary hover:text-text-primary hover:bg-bg-high/50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
