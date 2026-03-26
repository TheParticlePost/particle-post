import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "About Particle Post and how we create AI-powered financial and technology insights.",
};

export default async function AboutPage() {
  const aboutPath = path.join(process.cwd(), "blog", "content", "about.md");
  let content = "";
  let title = "About Particle Post";

  if (fs.existsSync(aboutPath)) {
    const raw = fs.readFileSync(aboutPath, "utf-8");
    const parsed = matter(raw);
    content = parsed.content;
    title = parsed.data.title || title;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-display-lg mb-8">{title}</h1>
      {content ? (
        <div className="prose">
          <MDXRemote source={content} />
        </div>
      ) : (
        <div className="prose">
          <p>
            Particle Post delivers AI-powered insights at the intersection of
            finance, technology, and energy. Our content is researched, written,
            and fact-checked by an autonomous AI editorial team, then curated by
            human editors.
          </p>
        </div>
      )}
    </div>
  );
}
