"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SearchTrigger } from "@/components/search/search-trigger";
import { UserMenu } from "@/components/auth/user-menu";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/categories/", label: "Categories" },
  { href: "/about/", label: "About" },
];

interface UserProfile {
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    if (!supabase) return;

    async function getUser() {
      const { data: { user: authUser } } = await supabase!.auth.getUser();
      if (!authUser) {
        setUser(null);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name, avatar_url, role")
        .eq("id", authUser.id)
        .single();

      setUser(profile || {
        email: authUser.email || "",
        full_name: authUser.user_metadata?.full_name || null,
        avatar_url: authUser.user_metadata?.avatar_url || null,
        role: "user",
      });
    }

    getUser();

    const { data: { subscription } } = supabase!.auth.onAuthStateChange(() => {
      getUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 h-16",
          "glass-card rounded-none border-t-0 border-x-0",
          "border-b border-[var(--glass-border)]"
        )}
      >
        <nav className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
            <span className="font-display text-xl tracking-tight">
              Particle Post
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-body-sm text-foreground-secondary hover:text-foreground transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <SearchTrigger />
            </div>

            <ThemeToggle />

            {user ? (
              <div className="hidden sm:block">
                <UserMenu user={user} />
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => {
                  const el = document.getElementById("newsletter-cta");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                  else window.location.href = "/#newsletter-cta";
                }}
              >
                Subscribe
              </Button>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden w-10 h-10 rounded-lg flex items-center justify-center
                         text-foreground-secondary hover:text-foreground
                         hover:bg-bg-tertiary/50 transition-all duration-200"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </nav>
      </header>

      {/* Spacer for fixed nav */}
      <div className="h-16" />

      <MobileNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)} links={NAV_LINKS} />
    </>
  );
}
