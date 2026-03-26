import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Particle Post terms of service and usage guidelines.",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-display-lg mb-8">Terms of Service</h1>
      <div className="prose">
        <p className="text-foreground-secondary text-body-sm mb-8">
          Last updated: March 2026
        </p>

        <h2>Acceptance of Terms</h2>
        <p>
          By accessing Particle Post, you agree to these terms. If you disagree,
          please do not use the site.
        </p>

        <h2>Content</h2>
        <p>
          All articles are generated with AI assistance and curated by human
          editors. Content is for informational purposes only and does not
          constitute financial, legal, or professional advice.
        </p>

        <h2>Intellectual Property</h2>
        <p>
          All content, design, and branding on Particle Post are protected by
          copyright. You may share articles with proper attribution but may not
          reproduce them in full without permission.
        </p>

        <h2>Disclaimer</h2>
        <p>
          Particle Post provides information on an &quot;as is&quot; basis. We
          make no warranties regarding accuracy, completeness, or timeliness of
          the information presented.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          Particle Post shall not be liable for any damages arising from the
          use of this website or reliance on its content.
        </p>
      </div>
    </div>
  );
}
