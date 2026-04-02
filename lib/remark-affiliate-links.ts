/**
 * Remark plugin for runtime affiliate link insertion.
 *
 * Fetches active affiliate links from Supabase and replaces keyword
 * occurrences in article text nodes with affiliate links.
 *
 * Usage in MDX processing:
 *   import { remarkAffiliateLinks } from "@/lib/remark-affiliate-links";
 *   // Pass to MDX compiler: remarkPlugins: [remarkAffiliateLinks]
 */

import { visit } from "unist-util-visit";
import type { Root, Text, Link } from "mdast";

interface AffiliateLink {
  keyword: string;
  url: string;
  max_insertions_per_article: number;
}

// Cache affiliate links for 1 hour
let cachedLinks: AffiliateLink[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getAffiliateLinks(): Promise<AffiliateLink[]> {
  const now = Date.now();
  if (cachedLinks && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedLinks;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return [];

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/affiliate_links?active=eq.true&select=keyword,url,max_insertions_per_article`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        next: { revalidate: 3600 },
      }
    );

    if (res.ok) {
      cachedLinks = (await res.json()) as AffiliateLink[];
      cacheTimestamp = now;
      return cachedLinks;
    }
  } catch {
    // silently fail — articles render without affiliate links
  }

  return [];
}

export function remarkAffiliateLinks() {
  return async function transformer(tree: Root) {
    const links = await getAffiliateLinks();
    if (links.length === 0) return;

    // Track insertion counts per keyword
    const counts = new Map<string, number>();

    visit(tree, "text", (node: Text, index, parent) => {
      // Don't insert inside headings, links, or code
      if (!parent || !index) return;
      const ptype = parent.type as string;
      if (
        ptype === "heading" ||
        ptype === "link" ||
        ptype === "code" ||
        ptype === "inlineCode"
      ) {
        return;
      }

      const text = node.value;

      for (const link of links) {
        const current = counts.get(link.keyword) || 0;
        if (current >= link.max_insertions_per_article) continue;

        const regex = new RegExp(`\\b(${escapeRegex(link.keyword)})\\b`, "i");
        const match = regex.exec(text);

        if (match && match.index !== undefined) {
          // Split the text node into: before + link + after
          const before = text.slice(0, match.index);
          const matched = match[1];
          const after = text.slice(match.index + matched.length);

          const newNodes: (Text | Link)[] = [];

          if (before) {
            newNodes.push({ type: "text", value: before });
          }

          newNodes.push({
            type: "link",
            url: link.url,
            data: {
              hProperties: { rel: "sponsored" },
            },
            children: [{ type: "text", value: matched }],
          } as Link);

          if (after) {
            newNodes.push({ type: "text", value: after });
          }

          // Replace the current text node with the new nodes
          if (parent.children && typeof index === "number") {
            parent.children.splice(index, 1, ...newNodes);
          }

          counts.set(link.keyword, current + 1);
          return; // Process one link per text node to avoid complexity
        }
      }
    });
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
