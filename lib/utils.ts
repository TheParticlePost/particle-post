import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 238;
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const CATEGORIES = [
  { name: "AI & Finance", slug: "ai-finance", color: "#00D4AA" },
  { name: "Risk & Compliance", slug: "risk-compliance", color: "#3B82F6" },
  { name: "Enterprise Tech", slug: "enterprise-tech", color: "#8B5CF6" },
  { name: "Energy & ESG", slug: "energy-esg", color: "#F59E0B" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
