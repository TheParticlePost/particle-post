"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SearchTrigger } from "@/components/search/search-trigger";
import { UserMenu } from "@/components/auth/user-menu";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Briefings" },
  { href: "/categories/", label: "Deep Dives" },
  { href: "/pulse/", label: "AI Pulse" },
  { href: "/archive/", label: "Archive" },
];

interface UserProfile {
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();

    async function getUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setUser(null);
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email, full_name, avatar_url, role")
        .eq("id", authUser.id)
        .maybeSingle();

      if (profileError) {
        console.warn("[Navbar] Profile fetch error:", profileError.message);
      }

      setUser(profile || {
        email: authUser.email || "",
        full_name: authUser.user_metadata?.full_name || null,
        avatar_url: authUser.user_metadata?.avatar_url || null,
        role: "user",
      });
    }

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 h-16",
          "transition-all duration-[180ms] ease-kinetic",
          scrolled
            ? "bg-[var(--glass-bg)] backdrop-blur-[12px] border-b border-border-ghost"
            : "bg-transparent border-b border-transparent"
        )}
      >
        <nav className="max-w-container mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          {/* Logo — monogram SVG + wordmark */}
          <Link href="/" aria-label="Particle Post home" className="flex items-center gap-2.5 group">
            {/* Light theme monogram */}
            <img
              src="/logos/monogram-light.svg"
              alt="Particle Post"
              width={32}
              height={32}
              className="dark:hidden"
            />
            {/* Dark theme monogram */}
            <img
              src="/logos/monogram-dark.svg"
              alt="Particle Post"
              width={32}
              height={32}
              className="hidden dark:block"
            />
            <span className="font-display text-lg font-bold uppercase tracking-[-0.02em] text-text-primary hidden sm:inline">
              Particle Post
            </span>
          </Link>

          {/* Desktop nav links — DM Sans 14px/500 */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-body-sm font-medium transition-colors duration-[180ms] ease-kinetic",
                    isActive
                      ? "text-accent border-b-2 border-accent pb-0.5"
                      : "text-text-body hover:text-accent"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
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
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="compact">
                    Log in
                  </Button>
                </Link>
                <Link href="/subscribe">
                  <Button variant="primary" size="compact">
                    Subscribe
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden w-10 h-10 rounded-lg flex items-center justify-center
                         text-text-secondary hover:text-text-primary
                         hover:bg-bg-high/50 transition-colors duration-[180ms] ease-kinetic"
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
