"use client";

import Link from "next/link";
import Image from "next/image";
import { OverlineLabel } from "@/components/ui/overline-label";
import { DataText } from "@/components/ui/data-text";
import { DataTicker } from "@/components/ui/data-ticker";
import { SentimentBadge } from "@/components/ui/sentiment-badge";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { FadeUp } from "@/components/effects/fade-up";
import { formatDateShort } from "@/lib/utils";
import type { PostMeta } from "@/lib/types";

interface HomeContentProps {
  latestPost: PostMeta | null;
  morningPosts: PostMeta[];
  eveningPosts: PostMeta[];
  featuredDeepDive: PostMeta | null;
  trendingPosts: PostMeta[];
}

const MOCK_TICKER = [
  { label: "S&P 500", value: "5,234.18", change: 0.87 },
  { label: "NASDAQ", value: "16,428.82", change: 1.24 },
  { label: "BTC/USD", value: "68,421.30", change: -0.53 },
  { label: "EUR/USD", value: "1.0842", change: 0.12 },
  { label: "10Y UST", value: "4.28%", change: -0.03 },
  { label: "GOLD", value: "2,178.40", change: 0.34 },
];

export function HomeContent({
  latestPost,
  morningPosts,
  eveningPosts,
  featuredDeepDive,
  trendingPosts,
}: HomeContentProps) {
  return (
    <div>
      {/* ═══ SECTION 1: HERO — bg-base ═══ */}
      <section className="bg-bg-base py-24 px-4 sm:px-6">
        <div className="max-w-container mx-auto">
          <FadeUp>
            <OverlineLabel className="mb-6 block">Morning Briefing</OverlineLabel>

            {latestPost ? (
              <Link href={`/posts/${latestPost.slug}/`} className="group">
                <h1 className="font-display text-display-hero text-text-primary mb-6 max-w-4xl group-hover:text-accent transition-colors duration-[180ms] ease-kinetic">
                  {latestPost.title}
                </h1>
              </Link>
            ) : (
              <h1 className="font-display text-display-hero text-text-primary mb-6 max-w-4xl">
                AI-Powered Intelligence for Global Leaders
              </h1>
            )}

            {latestPost && (
              <p className="text-body-lg text-text-secondary mb-10 max-w-2xl">
                {latestPost.description}
              </p>
            )}

            {/* Email signup */}
            <div className="max-w-md mb-4">
              <SubscribeForm />
            </div>

            <DataText as="p" className="uppercase tracking-widest text-text-muted text-caption">
              Join 12,000+ leaders. Free. Twice daily.
            </DataText>
          </FadeUp>
        </div>
      </section>

      {/* ═══ SECTION 2: AM/PM BRIEFINGS — bg-low (No-Line Rule shift) ═══ */}
      <section className="bg-bg-low py-20 px-4 sm:px-6">
        <div className="max-w-container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Morning Edition */}
            <FadeUp>
              <div className="bg-bg-container border border-border-ghost rounded-lg p-8 hover:border-accent transition-colors duration-[180ms] ease-kinetic">
                <OverlineLabel className="mb-4 block">Morning Edition</OverlineLabel>
                <h3 className="font-display text-display-lg text-text-primary mb-8">
                  AM Intelligence Wrap
                </h3>
                <ul className="space-y-6">
                  {morningPosts.map((post, i) => {
                    const hours = ["07:00 AM", "07:15 AM", "07:45 AM", "08:00 AM"];
                    return (
                      <li key={post.slug} className="group">
                        <Link href={`/posts/${post.slug}/`}>
                          <DataText className="text-accent text-caption block mb-1">
                            {hours[i] || "08:30 AM"}
                          </DataText>
                          <h4 className="text-body-lg text-text-body group-hover:text-accent transition-colors duration-[180ms]">
                            {post.title}
                          </h4>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </FadeUp>

            {/* Evening Edition */}
            <FadeUp delay={0.05}>
              <div className="bg-bg-container border border-border-ghost rounded-lg p-8 hover:border-accent transition-colors duration-[180ms] ease-kinetic">
                <OverlineLabel className="mb-4 block">Evening Edition</OverlineLabel>
                <h3 className="font-display text-display-lg text-text-primary mb-8">
                  PM Market Closing
                </h3>
                <ul className="space-y-6">
                  {eveningPosts.map((post, i) => {
                    const hours = ["04:30 PM", "05:00 PM", "05:15 PM", "06:00 PM"];
                    return (
                      <li key={post.slug} className="group">
                        <Link href={`/posts/${post.slug}/`}>
                          <DataText className="text-accent text-caption block mb-1">
                            {hours[i] || "06:30 PM"}
                          </DataText>
                          <h4 className="text-body-lg text-text-body group-hover:text-accent transition-colors duration-[180ms]">
                            {post.title}
                          </h4>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 3: FEATURED DEEP DIVE — bg-base ═══ */}
      {featuredDeepDive && (
        <section className="bg-bg-base py-20 px-4 sm:px-6">
          <div className="max-w-container mx-auto">
            <FadeUp>
              <Link
                href={`/posts/${featuredDeepDive.slug}/`}
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
                    className="block bg-bg-container border border-border-ghost rounded-lg p-6 hover:border-accent transition-colors duration-[180ms] ease-kinetic group"
                  >
                    <div className="flex justify-between items-start mb-6">
                      {post.categories[0] && (
                        <span className="px-2 py-1 bg-bg-high font-mono text-[10px] text-text-primary uppercase tracking-widest rounded-lg">
                          {post.categories[0]}
                        </span>
                      )}
                      <SentimentBadge
                        sentiment={i === 1 ? "bearish" : "bullish"}
                      />
                    </div>
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
          </div>
        </section>
      )}

      {/* ═══ SECTION 5: DATA TICKER — bg-deep ═══ */}
      <DataTicker items={MOCK_TICKER} />
    </div>
  );
}
