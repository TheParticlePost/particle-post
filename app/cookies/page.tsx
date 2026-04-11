import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Particle Post cookie policy — what cookies we use, what they store, and how to manage your preferences.",
};

const LAST_UPDATED = "April 10, 2026";

export default function CookiesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-display-lg mb-4">Cookie Policy</h1>
      <p className="text-text-secondary text-body-sm mb-8">
        Last updated: {LAST_UPDATED}
      </p>

      <div className="prose prose-invert max-w-none">
        <p>
          This Cookie Policy explains the small text files (&ldquo;cookies&rdquo;
          and similar storage technologies) that Particle Post uses on{" "}
          <a href="https://theparticlepost.com">theparticlepost.com</a>. It
          should be read alongside our{" "}
          <Link href="/privacy/">Privacy Policy</Link>.
        </p>

        <h2>1. What cookies are</h2>
        <p>
          Cookies are small files stored on your device by your browser when
          you visit a website. They&rsquo;re used to remember preferences,
          keep you logged in, and (with your consent) measure how the site
          is being used. Some &ldquo;cookies&rdquo; in modern websites are
          actually entries in <code>localStorage</code> rather than
          traditional HTTP cookies; we treat both with the same care.
        </p>

        <h2>2. Cookies we set</h2>

        <h3>Essential — always on</h3>
        <p>
          These are required for the site to function. They cannot be
          disabled because nothing here would work without them.
        </p>
        <ul>
          <li>
            <strong>Theme preference</strong> — stored in{" "}
            <code>localStorage</code>. Remembers whether you chose dark or
            light mode. Never sent to our servers.
          </li>
          <li>
            <strong>Cookie consent state</strong> — stored in{" "}
            <code>localStorage</code>. Remembers whether you accepted or
            declined optional cookies, so we don&rsquo;t ask again on every
            page load.
          </li>
          <li>
            <strong>Supabase auth session</strong> — when you sign in, a
            session cookie is set so you stay logged in across page loads.
            Removed when you log out or when the session expires.
          </li>
        </ul>

        <h3>Analytics — only with your consent</h3>
        <p>
          We load Google Analytics 4 only after you opt in via the cookie
          consent banner. Reject and these cookies are never set; the GA
          script is not loaded at all. The consent banner appears on your
          first visit and is reachable any time from the link below.
        </p>
        <ul>
          <li>
            <strong><code>_ga</code></strong> — Google Analytics. Random
            client ID used to distinguish unique visitors. Expires after 2
            years.
          </li>
          <li>
            <strong><code>_ga_&lt;property-id&gt;</code></strong> — Google
            Analytics. Stores session state. Expires after 2 years.
          </li>
        </ul>

        <h3>Marketing — none</h3>
        <p>
          We do not set marketing or advertising cookies. We do not run
          remarketing, audience tracking, or third-party ad networks.
        </p>

        <h2>3. Managing your preferences</h2>
        <p>
          You can change your cookie preferences at any time:
        </p>
        <ul>
          <li>
            Open your browser&rsquo;s privacy settings to clear or block
            cookies for this site.
          </li>
          <li>
            Reload the site after clearing the consent state in
            localStorage to see the consent banner again.
          </li>
          <li>
            Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> if
            you have a question or want to exercise any of your data subject
            rights described in the{" "}
            <Link href="/privacy/">Privacy Policy</Link>.
          </li>
        </ul>

        <h2>4. Updates</h2>
        <p>
          We may update this Cookie Policy from time to time. The
          &ldquo;Last updated&rdquo; date at the top reflects the most
          recent revision. Material changes will be flagged on the site for
          at least 14 days.
        </p>
      </div>
    </div>
  );
}
