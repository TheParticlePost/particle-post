"use client";

import { useEffect, useRef, useState } from "react";
import GithubSlugger from "github-slugger";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

function extractHeadings(content: string): TocItem[] {
  // Match the exact same algorithm rehype-slug uses server-side:
  // github-slugger keeps a counter so duplicate headings get "-1", "-2" suffixes.
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    // Strip markdown bold/italic/code syntax from heading text
    const text = match[2]
      .trim()
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`(.*?)`/g, "$1");
    const id = slugger.slug(text);
    items.push({ id, text, level });
  }

  return items;
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState("");
  const headings = extractHeadings(content);
  const navRef = useRef<HTMLElement | null>(null);
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0.1 }
    );

    for (const heading of headings) {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  // Keep the active TOC link visible inside the sidebar's own scrollable
  // area. Without this, the TOC list stays frozen in place while the user
  // scrolls the article, so the highlighted item slides out of view.
  useEffect(() => {
    if (!activeId) return;
    const nav = navRef.current;
    const link = linkRefs.current.get(activeId);
    if (!nav || !link) return;

    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const linkTopInNav = linkRect.top - navRect.top + nav.scrollTop;
    const linkBottomInNav = linkTopInNav + linkRect.height;

    // Keep ~2 items of headroom above and below when auto-scrolling.
    const padding = 48;
    if (linkTopInNav < nav.scrollTop + padding) {
      nav.scrollTo({ top: Math.max(0, linkTopInNav - padding), behavior: "smooth" });
    } else if (linkBottomInNav > nav.scrollTop + nav.clientHeight - padding) {
      nav.scrollTo({
        top: linkBottomInNav - nav.clientHeight + padding,
        behavior: "smooth",
      });
    }
  }, [activeId]);

  if (headings.length === 0) return null;

  return (
    <nav
      ref={navRef}
      className="hidden xl:block sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-hide"
    >
      <p className="text-body-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
        On this page
      </p>
      <ul className="space-y-1 border-l border-border-ghost">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              ref={(el) => {
                if (el) linkRefs.current.set(heading.id, el);
                else linkRefs.current.delete(heading.id);
              }}
              className={cn(
                "block py-1 text-body-sm transition-all duration-200 border-l-2 -ml-[2px]",
                heading.level === 3 ? "pl-6" : "pl-4",
                activeId === heading.id
                  ? "border-accent text-accent"
                  : "border-transparent text-text-muted hover:text-text-primary hover:border-border-hover"
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
