"use client";

import { cn } from "@/lib/utils";

interface FilterPillProps {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function FilterPill({
  children,
  active = false,
  onClick,
  className,
}: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center px-4 py-2 rounded-lg text-body-sm font-medium",
        "transition-colors duration-150 ease-kinetic",
        "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
        active
          ? "bg-accent text-[#F5F0EB]"
          : "bg-bg-high text-text-secondary hover:text-text-primary",
        className
      )}
    >
      {children}
    </button>
  );
}
