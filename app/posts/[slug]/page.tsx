import { notFound } from "next/navigation";
import Image from "next/image";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getPostBySlug, getAllSlugs, getRelatedPosts } from "@/lib/content";
import { convertHugoShortcodes } from "@/lib/remark-hugo-shortcodes";
import { mdxComponents } from "@/components/mdx/mdx-components";
import { Badge } from "@/components/ui/badge";
import { ReadingTime } from "@/components/articles/reading-time";
import { ImageCredit } from "@/components/articles/image-credit";
import { TableOfContents } from "@/components/articles/table-of-contents";
import { FaqSection } from "@/components/articles/faq-section";
import { RelatedArticles } from "@/components/articles/related-articles";
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
    <article className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <header className="max-w-3xl mx-auto mb-8">
        {/* Categories */}
        <div className="flex items-center gap-2 mb-4">
          {post.categories.slice(0, 2).map((cat) => (
            <Badge key={cat} category={cat} />
          ))}
        </div>

        {/* Title */}
        <h1 className="font-display text-display-lg mb-4">{post.title}</h1>

        {/* Meta */}
        <div className="flex items-center gap-4 text-body-sm text-foreground-secondary">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span className="text-foreground-muted">&middot;</span>
          <ReadingTime minutes={post.readingTime} />
        </div>
      </header>

      {/* Cover Image */}
      {post.coverImage && (
        <div className="max-w-4xl mx-auto mb-10">
          <div className="relative aspect-[2/1] rounded-2xl overflow-hidden">
            <Image
              src={post.coverImage.url}
              alt={post.coverImage.alt || post.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 896px"
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

      {/* Content + ToC */}
      <div className="max-w-6xl mx-auto flex gap-10">
        {/* Main content */}
        <div className="max-w-3xl mx-auto flex-1 min-w-0">
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

        {/* Sidebar ToC */}
        <aside className="hidden xl:block w-64 shrink-0">
          <TableOfContents content={post.content} />
        </aside>
      </div>

      {/* Related */}
      <div className="max-w-4xl mx-auto">
        <RelatedArticles articles={relatedPosts} />
      </div>
    </article>
  );
}
