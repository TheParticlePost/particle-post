"use client";

import Link from "next/link";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  links: { href: string; label: string }[];
}

export function MobileNav({ isOpen, onClose, links }: MobileNavProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] md:hidden transition-all duration-300",
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-bg-base/80 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Panel — Onyx bg */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 w-72 bg-bg-container border-l border-border-ghost",
          "flex flex-col p-6 transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Close */}
        <div className="flex justify-end mb-8">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg flex items-center justify-center
                       text-text-secondary hover:text-text-primary
                       hover:bg-bg-high/50 transition-colors duration-[180ms] ease-kinetic"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Links */}
        <nav className="flex flex-col gap-1">
          {links.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={cn(
                "px-4 py-3 rounded-lg text-body-lg text-text-body",
                "hover:text-accent hover:bg-bg-high/50 transition-colors duration-[180ms] ease-kinetic",
                isOpen && "animate-slide-up"
              )}
              style={{ animationDelay: `${i * 50 + 100}ms`, animationFillMode: "both" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="mt-auto pt-6">
          <Link href="/subscribe" onClick={onClose}>
            <Button variant="primary" size="default" className="w-full">
              Subscribe
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
