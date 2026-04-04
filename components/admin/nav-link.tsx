"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export function NavLink({ href, label, icon }: NavLinkProps) {
  const pathname = usePathname();
  const isActive =
    href === "/admin" || href === "/admin/"
      ? pathname === "/admin" || pathname === "/admin/"
      : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-sm font-medium transition-colors duration-200",
        isActive
          ? "text-accent bg-accent/10"
          : "text-text-secondary hover:text-text-primary hover:bg-bg-high"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
