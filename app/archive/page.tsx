import type { Metadata } from "next";
import { getAllPosts } from "@/lib/content";
import { ArchiveContent } from "@/components/archive/archive-content";

export const metadata: Metadata = {
  title: "Archive",
  description: "Every morning and evening briefing, searchable.",
};

export default function ArchivePage() {
  const posts = getAllPosts();

  const articles = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    date: p.date,
    readingTime: p.readingTime,
    categories: p.categories,
    coverImage: p.coverImage?.url,
  }));

  return <ArchiveContent articles={articles} />;
}
