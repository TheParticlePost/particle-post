import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { AUTHORS } from "@/lib/authors";
import { OverlineLabel } from "@/components/ui/overline-label";
import { DataText } from "@/components/ui/data-text";
import { FadeUp } from "@/components/effects/fade-up";

export const metadata: Metadata = {
  title: "Editorial Team",
  description:
    "The curators behind Particle Post — the editors who set direction, review every published piece, and own the editorial standards.",
};

export default function AuthorsIndexPage() {
  return (
    <div className="max-w-container mx-auto px-4 sm:px-6 py-16">
      <FadeUp>
        <OverlineLabel className="mb-4 block">Editorial Team</OverlineLabel>
        <h1 className="font-display text-display-xl text-text-primary mb-4">
          The curators behind Particle Post
        </h1>
        <p className="text-body-lg text-text-secondary max-w-prose mb-12">
          We combine a research and writing pipeline with editorial oversight.
          Our curators set direction, review every published piece, and own
          the editorial standards. The pipeline accelerates research and
          drafting; humans make the calls on what ships.
        </p>
      </FadeUp>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {AUTHORS.map((author, i) => (
          <FadeUp key={author.slug} delay={i * 0.05}>
            <Link
              href={`/authors/${author.slug}/`}
              className="block bg-bg-container border border-border-ghost rounded-lg p-6 hover:border-accent transition-colors duration-[180ms] ease-kinetic group h-full"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border border-border-ghost flex-shrink-0">
                  <Image
                    src={author.avatar}
                    alt={author.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <h2 className="font-display text-display-sm text-text-primary group-hover:text-accent transition-colors duration-[180ms]">
                    {author.name}
                  </h2>
                  <DataText className="text-caption text-text-muted uppercase tracking-widest">
                    {author.role}
                  </DataText>
                </div>
              </div>
              <p className="text-body-sm text-text-secondary line-clamp-4">
                {author.bio}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {author.expertise.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[10px] uppercase tracking-widest text-text-muted border border-border-ghost rounded px-2 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          </FadeUp>
        ))}
      </div>
    </div>
  );
}
