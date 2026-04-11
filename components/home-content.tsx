"use client";

import Link from "next/link";
import Image from "next/image";
import { OverlineLabel } from "@/components/ui/overline-label";
import { DataText } from "@/components/ui/data-text";
import { DataTicker } from "@/components/ui/data-ticker";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { FadeUp } from "@/components/effects/fade-up";
import { formatDateShort } from "@/lib/utils";
import type { PostMeta } from "@/lib/types";
import { SUBSCRIBER_COUNT_THRESHOLD } from "@/lib/constants";

interface HomeContentProps {
  latestPost: PostMeta | null;
  recentPosts: PostMeta[];
  featuredDeepDive: PostMeta | null;
  trendingPosts: PostMeta[];
  /**
   * Live count from Supabase, fetched server-side and passed in.
   * Below SUBSCRIBER_COUNT_THRESHOLD we hide the count entirely — false
   * specificity hurts trust more than absence.
   */
  subscriberCount: number;
}

const AI_TICKER = [
  { label: "AI ADOPTION", value: "78% of Fortune 500" },
  { label: "ENTERPRISE AI SPEND", value: "$200B+ in 2026" },
  { label: "TOP USE CASE", value: "Customer Service Automation" },
  { label: "AVG IMPLEMENTATION", value: "6–12 months" },
  { label: "ROI TIMELINE", value: "9–18 months" },
];

export function HomeContent({
  latestPost,
  recentPosts,
  featuredDeepDive,
  trendingPosts,
  subscriberCount,
}: HomeContentProps) {
  const showCount = subscriberCount >= SUBSCRIBER_COUNT_THRESHOLD;
  return (
    <div>
      {/* ═══ SECTION 1: HERO — bg-base ═══ */}
      <section className="bg-bg-base py-24 px-4 sm:px-6">
        <div className="max-w-container mx-auto">
          <FadeUp>
            <OverlineLabel className="mb-6 block">Twice Daily · Free</OverlineLabel>

            <h1 className="font-display text-display-hero text-text-primary mb-6 max-w-4xl">
              AI is changing how companies operate. We tell you what to do about it.
            </h1>

            <p className="text-body-lg text-text-secondary mb-10 max-w-2xl">
              Implementation strategies, operational playbooks, and executive
              decisions — delivered before your morning meeting.
            </p>

            {latestPost && (
              <Link
                href={`/posts/${latestPost.slug}/`}
                className="block bg-bg-container border border-border-ghost rounded-lg p-6 mb-10 max-w-2xl editorial-stripe hover:border-border-hover transition-colors duration-[180ms] ease-kinetic group"
              >
                <OverlineLabel className="mb-2 block text-[10px]">Latest</OverlineLabel>
                <h2 className="font-display text-display-sm text-text-primary group-hover:text-accent transition-colors duration-[180ms]">
                  {latestPost.title}
                </h2>
                <DataText as="p" className="mt-2 text-caption">
                  {latestPost.readingTime} min read · {formatDateShort(latestPost.date)}
                </DataText>
              </Link>
            )}

            {/* Email signup */}
            <div className="max-w-md mb-4">
              <SubscribeForm />
            </div>

            <DataText as="p" className="uppercase tracking-widest text-text-muted text-caption">
              {showCount
                ? `Join ${subscriberCount.toLocaleString()}+ leaders. Free. Twice daily.`
                : "Free. Twice daily."}
            </DataText>
          </FadeUp>
        </div>
      </section>

      {/* ═══ SECTION 2: LATEST BRIEFINGS — bg-low (No-Line Rule shift) ═══ */}
      {recentPosts.length > 0 && (
        <section className="bg-bg-low py-20 px-4 sm:px-6">
          <div className="max-w-container mx-auto">
            <FadeUp>
              <OverlineLabel className="mb-4 block">Latest Briefings</OverlineLabel>
              <h3 className="font-display text-display-lg text-text-primary mb-10">
                Intelligence Wrap
              </h3>
            </FadeUp>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recentPosts.map((post, i) => (
                <FadeUp key={post.slug} delay={i * 0.03}>
                  <Link
                    href={`/posts/${post.slug}/`}
                    aria-label={post.title}
                    className="block bg-bg-container border border-border-ghost rounded-lg p-6 hover:border-accent transition-colors duration-[180ms] ease-kinetic group"
                  >
                    {post.categories[0] && (
                      <OverlineLabel className="mb-2 block text-[10px]">
                        {post.categories[0]}
                      </OverlineLabel>
                    )}
                    <h4 className="text-body-lg text-text-body group-hover:text-accent transition-colors duration-[180ms] mb-3">
                      {post.title}
                    </h4>
                    <DataText className="text-caption text-text-muted">
                      {post.readingTime} min read · {formatDateShort(post.date)}
                    </DataText>
                  </Link>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ SECTION 3: FEATURED DEEP DIVE — bg-base ═══ */}
      {featuredDeepDive && (
        <section className="bg-bg-base py-20 px-4 sm:px-6">
          <div className="max-w-container mx-auto">
            <FadeUp>
              <Link
                href={`/posts/${featuredDeepDive.slug}/`}
                aria-label={featuredDeepDive.title}
                className="block editorial-stripe bg-bg-container border border-border-ghost rounded-lg p-8 md:p-12 hover:border-border-hover transition-colors duration-[180ms] ease-kinetic group"
              >
                <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
                  <div className="flex-1">
                    <OverlineLabel className="mb-4 block">Deep Dive</OverlineLabel>
                    <h2 className="font-display text-display-lg md:text-[2.5rem] md:leading-[1.12] text-text-primary mb-6 group-hover:text-accent transition-colors duration-[180ms]">
                      {featuredDeepDive.title}
                    </h2>
                    <p className="text-body-lg text-text-secondary leading-relaxed mb-8">
                      {featuredDeepDive.description}
                    </p>
                    <div className="flex items-center gap-6">
                      <DataText>{featuredDeepDive.readingTime} min read</DataText>
                      <DataText>
                        By {featuredDeepDive.author || "Particle Post"}
                      </DataText>
                    </div>
                  </div>
                  {featuredDeepDive.coverImage && (
                    <div className="w-full md:w-1/3 overflow-hidden rounded-lg">
                      <Image
                        src={featuredDeepDive.coverImage.url}
                        alt={featuredDeepDive.title}
                        width={400}
                        height={256}
                        className="w-full h-64 object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      />
                    </div>
                  )}
                </div>
              </Link>
            </FadeUp>
          </div>
        </section>
      )}

      {/* ═══ SECTION 4: TRENDING NOW — bg-low ═══ */}
      {trendingPosts.length > 0 && (
        <section className="bg-bg-low py-20 px-4 sm:px-6">
          <div className="max-w-container mx-auto">
            <FadeUp>
              <div className="flex items-center gap-3 mb-8">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <OverlineLabel>Trending Now</OverlineLabel>
              </div>
            </FadeUp>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {trendingPosts.map((post, i) => (
                <FadeUp key={post.slug} delay={i * 0.05}>
                  <Link
                    href={`/posts/${post.slug}/`}
                    aria-label={post.title}
                    className="block bg-bg-container border border-border-ghost rounded-lg p-6 hover:border-accent transition-colors duration-[180ms] ease-kinetic group"
                  >
                    {post.categories[0] && (
                      <OverlineLabel className="mb-4 block">{post.categories[0]}</OverlineLabel>
                    )}
                    <h4 className="font-display text-display-sm text-text-primary mb-8 leading-snug group-hover:text-accent transition-colors duration-[180ms]">
                      {post.title}
                    </h4>
                    <div className="flex justify-between items-center">
                      <DataText className="text-caption">{formatDateShort(post.date)}</DataText>
                      <DataText className="text-caption">{post.readingTime} min read</DataText>
                    </div>
                  </Link>
                </FadeUp>
              ))}
            </div>

            {/* View all link */}
            <FadeUp delay={0.15}>
              <div className="mt-10 text-center">
                <Link
                  href="/archive/"
                  className="font-mono text-data text-accent hover:text-accent-hover transition-colors"
                >
                  View all in Archive &rarr;
                </Link>
              </div>
            </FadeUp>
          </div>
        </section>
      )}

      {/* ═══ SECTION 5: AI DATA TICKER — bg-deep ═══ */}
      <DataTicker items={AI_TICKER} />
    </div>
  );
}
