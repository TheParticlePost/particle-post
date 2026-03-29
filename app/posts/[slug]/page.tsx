import { notFound } from "next/navigation";
import Image from "next/image";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getPostBySlug, getAllSlugs, getRelatedPosts } from "@/lib/content";
import { convertHugoShortcodes } from "@/lib/remark-hugo-shortcodes";
import { mdxComponents } from "@/components/mdx/mdx-components";
import { OverlineLabel } from "@/components/ui/overline-label";
import { DataText } from "@/components/ui/data-text";
import { ReadingTime } from "@/components/articles/reading-time";
import { ImageCredit } from "@/components/articles/image-credit";
import { TableOfContents } from "@/components/articles/table-of-contents";
import { FaqSection } from "@/components/articles/faq-section";
import { RelatedArticles } from "@/components/articles/related-articles";
import { ScrollProgress } from "@/components/effects/scroll-progress";
import { SidebarRelated } from "@/components/articles/sidebar-related";
import { MarketSnapshot } from "@/components/articles/market-snapshot";
import { NewsletterCta } from "@/components/newsletter/newsletter-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { generateArticleJsonLd, generateFaqJsonLd } from "@/lib/structured-data";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.lastmod,
      authors: [post.author || "Particle Post"],
      images: post.coverImage ? [{ url: post.coverImage.url }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const relatedPosts = getRelatedPosts(slug, 3);

  return (
    <>
      {/* Structured data (JSON-LD) */}
      <JsonLd data={generateArticleJsonLd(post)} />
      {post.faq_pairs && post.faq_pairs.length > 0 && (
        <JsonLd data={generateFaqJsonLd(post) as Record<string, unknown>} />
      )}

      {/* 3px vermillion progress bar */}
      <ScrollProgress />

      <article className="px-4 sm:px-6 py-8">
        {/* Header — centered, max 680px */}
        <header className="max-w-[680px] mx-auto mb-8">
          {/* Category overline */}
          <div className="flex items-center gap-2 mb-4">
            {post.categories.slice(0, 2).map((cat) => (
              <OverlineLabel key={cat}>{cat}</OverlineLabel>
            ))}
          </div>

          {/* Title — Sora Bold */}
          <h1 className="font-display text-display-xl text-text-primary mb-4">
            {post.title}
          </h1>

          {/* Meta line — IBM Plex Mono */}
          <div className="flex flex-wrap items-center gap-3">
            {post.author && (
              <DataText>By {post.author}</DataText>
            )}
            <DataText as="time">{formatDate(post.date)}</DataText>
            <DataText className="text-text-muted">&middot;</DataText>
            <ReadingTime minutes={post.readingTime} />
          </div>

          {/* Ghost border divider */}
          <div className="mt-6 border-b border-border-ghost" />
        </header>

        {/* Cover Image — centered, wider than body */}
        {post.coverImage && (
          <div className="max-w-[680px] mx-auto mb-10">
            <div className="relative aspect-[2/1] rounded-lg overflow-hidden">
              <Image
                src={post.coverImage.url}
                alt={post.coverImage.alt || post.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 680px"
                className="object-cover"
              />
            </div>
            <ImageCredit
              photographer={post.coverImage.photographer}
              photographerUrl={post.coverImage.photographer_url}
              source={post.coverImage.source}
              className="mt-2 text-center"
            />
          </div>
        )}

        {/* 3-column layout: Left sidebar (ToC) | Content | Right sidebar (Related + Pulse) */}
        <div className="max-w-[1200px] mx-auto flex gap-8">
          {/* LEFT SIDEBAR — Table of Contents, sticky */}
          <aside className="hidden xl:block w-[220px] shrink-0">
            <div className="sticky top-20">
              <TableOfContents content={post.content} />
            </div>
          </aside>

          {/* CENTER — Article body, 680px */}
          <div className="flex-1 min-w-0 max-w-[680px]">
            <div className="prose">
              <MDXRemote
                source={convertHugoShortcodes(post.content, !!(post.faq_pairs && post.faq_pairs.length > 0))}
                components={mdxComponents}
              />
            </div>

            {/* FAQ */}
            {post.faq_pairs && post.faq_pairs.length > 0 && (
              <FaqSection faqs={post.faq_pairs} />
            )}
          </div>

          {/* RIGHT SIDEBAR — Related Articles + AI Industry Pulse, sticky */}
          <aside className="hidden xl:block w-[260px] shrink-0">
            <div className="sticky top-20 space-y-6">
              <SidebarRelated articles={relatedPosts} />
              <MarketSnapshot />
            </div>
          </aside>
        </div>

        {/* Newsletter CTA */}
        <div className="max-w-[680px] mx-auto">
          <NewsletterCta />
        </div>

        {/* Related articles — full width below */}
        <div className="max-w-[1200px] mx-auto mt-16">
          <RelatedArticles articles={relatedPosts} />
        </div>
      </article>
    </>
  );
}
