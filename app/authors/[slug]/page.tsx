import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getAuthorBySlug, getAllAuthorSlugs, getAuthorForContentType } from "@/lib/authors";
import { getAllPostMeta } from "@/lib/content";
import { OverlineLabel } from "@/components/ui/overline-label";
import { DataText } from "@/components/ui/data-text";
import { ArticleGrid } from "@/components/articles/article-grid";
import { FadeUp } from "@/components/effects/fade-up";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllAuthorSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) return { title: "Author Not Found" };
  return {
    title: `${author.name} — ${author.role}`,
    description: author.bio,
  };
}

/**
 * Single author profile page. Shows the curator's bio + every article they
 * own (either by explicit `author` slug match in frontmatter, or by
 * content_type → curator fallback for unbackfilled legacy articles).
 *
 * The fallback path means a brand-new article that hasn't been backfilled
 * still appears under the right curator's page based on its content_type.
 */
export default async function AuthorPage({ params }: PageProps) {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) notFound();

  const allPosts = getAllPostMeta();

  const articlesByThisAuthor = allPosts.filter((post) => {
    if (post.author && post.author === author.slug) return true;
    // Fallback: legacy articles with no author slug — match by content_type
    if (!post.author && post.content_type) {
      return getAuthorForContentType(post.content_type).slug === author.slug;
    }
    return false;
  });

  const articleProps = articlesByThisAuthor.map((post) => ({
    slug: post.slug,
    title: post.title,
    description: post.description,
    date: post.date,
    readingTime: post.readingTime,
    categories: post.categories,
    coverImage: post.coverImage?.url,
  }));

  return (
    <div className="max-w-container mx-auto px-4 sm:px-6 py-16">
      <FadeUp>
        {/* Author header — bio + avatar */}
        <div className="flex flex-col md:flex-row md:items-start gap-8 mb-12 max-w-[760px]">
          <div className="relative w-28 h-28 rounded-full overflow-hidden border border-border-ghost flex-shrink-0">
            <Image
              src={author.avatar}
              alt={author.name}
              fill
              sizes="112px"
              className="object-cover"
              priority
            />
          </div>
          <div>
            <OverlineLabel className="mb-3 block">{author.role}</OverlineLabel>
            <h1 className="font-display text-display-xl text-text-primary mb-4">
              {author.name}
            </h1>
            <p className="text-body-lg text-text-secondary max-w-prose mb-4">
              {author.bio}
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {author.expertise.map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-[10px] uppercase tracking-widest text-text-muted border border-border-ghost rounded px-2 py-1"
                >
                  {tag}
                </span>
              ))}
            </div>
            {author.email && (
              <DataText className="text-caption">
                <a
                  href={`mailto:${author.email}`}
                  className="text-text-secondary hover:text-accent transition-colors"
                >
                  {author.email}
                </a>
              </DataText>
            )}
          </div>
        </div>
      </FadeUp>

      {/* Articles by this author */}
      <FadeUp delay={0.1}>
        <OverlineLabel className="mb-4 block">
          Articles by {author.name.split(" ")[0]}
        </OverlineLabel>
        <h2 className="font-display text-display-lg text-text-primary mb-8">
          {articleProps.length === 0
            ? "No articles yet"
            : `${articleProps.length} ${articleProps.length === 1 ? "article" : "articles"}`}
        </h2>
        <ArticleGrid articles={articleProps} columns={3} featureFirst={false} />
      </FadeUp>
    </div>
  );
}

