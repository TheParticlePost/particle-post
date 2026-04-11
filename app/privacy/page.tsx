import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Particle Post privacy policy — what personal data we collect, how we use it, and your rights under GDPR and Quebec Law 25.",
};

const LAST_UPDATED = "April 10, 2026";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-display-lg mb-4">Privacy Policy</h1>
      <p className="text-text-secondary text-body-sm mb-8">
        Last updated: {LAST_UPDATED}
      </p>

      <div className="prose prose-invert max-w-none">
        <p>
          This Privacy Policy explains how Particle Post (&ldquo;we&rdquo;,
          &ldquo;our&rdquo;, &ldquo;us&rdquo;) collects, uses, stores, and
          protects personal information when you visit{" "}
          <a href="https://theparticlepost.com">theparticlepost.com</a>,
          subscribe to our newsletter, register an account, or otherwise
          interact with our services. It is written to comply with the
          European Union General Data Protection Regulation (GDPR), the UK
          GDPR, and the Quebec <em>Act respecting the protection of personal
          information in the private sector</em> (Law 25, formerly Bill 64).
        </p>

        <h2>1. Data controller</h2>
        <p>
          The data controller responsible for your personal information is
          Particle Post. You can contact us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. The legal
          entity name and registered address are available on request and
          will be added here once incorporation is finalised. Until then,
          contact us by email for any privacy enquiry.
        </p>

        <h2>2. Personal data we collect</h2>
        <p>
          We collect the minimum amount of personal data needed to operate
          the service. The categories are:
        </p>
        <ul>
          <li>
            <strong>Newsletter subscription.</strong> Email address and the
            timestamp of your subscription. Optional: first name if you
            provide one. We do not enrich subscriber data from third-party
            sources.
          </li>
          <li>
            <strong>Account registration.</strong> Email address, hashed
            password (never stored in plain text — handled by Supabase Auth),
            and any profile fields you choose to fill in (display name,
            avatar URL). If you sign in with Google or GitHub OAuth, we
            receive your email and a provider-issued user ID.
          </li>
          <li>
            <strong>Specialist profiles.</strong> If you register as a
            specialist via our directory, we collect the information you
            submit (name, headline, bio, location, languages, LinkedIn URL,
            optional avatar, optional rate range).
          </li>
          <li>
            <strong>Analytics (only with your consent).</strong> When you
            opt in to analytics cookies, Google Analytics 4 collects
            anonymised usage data: pages viewed, referrer, approximate
            geographic region, device and browser type, and a randomly
            generated client ID stored in the <code>_ga</code> cookie. We
            do not enable advertising features or remarketing.
          </li>
          <li>
            <strong>Server logs.</strong> Vercel, our hosting provider,
            keeps short-lived access logs containing IP addresses and
            request metadata for security and abuse-prevention purposes.
            These are retained for up to 30 days.
          </li>
          <li>
            <strong>Cookies.</strong> A small set of essential cookies plus
            optional analytics cookies — described in detail in our{" "}
            <Link href="/cookies/">Cookie Policy</Link>.
          </li>
        </ul>

        <h2>3. Legal basis for processing (GDPR Article 6)</h2>
        <ul>
          <li>
            <strong>Newsletter subscription:</strong> your explicit consent
            (Article 6(1)(a)). You may withdraw consent at any time by
            clicking the unsubscribe link in any email.
          </li>
          <li>
            <strong>Account creation and authentication:</strong> performance
            of a contract (Article 6(1)(b)) — we cannot give you a logged-in
            experience without storing the relevant credentials.
          </li>
          <li>
            <strong>Analytics:</strong> your explicit, opt-in consent
            (Article 6(1)(a)), captured via the cookie consent banner.
            Without consent we do not load Google Analytics at all.
          </li>
          <li>
            <strong>Server logs and security monitoring:</strong> legitimate
            interest in protecting the service (Article 6(1)(f)), balanced
            against your right not to be tracked.
          </li>
        </ul>

        <h2>4. How long we keep your data</h2>
        <ul>
          <li>
            <strong>Newsletter:</strong> until you unsubscribe, plus 30 days
            for compliance audit purposes, after which the record is
            permanently deleted.
          </li>
          <li>
            <strong>Account and specialist profile:</strong> until you
            request deletion, after which the record is removed within 30
            days.
          </li>
          <li>
            <strong>Google Analytics:</strong> 14 months (the GA4 default
            for our property). We do not extend retention.
          </li>
          <li>
            <strong>Server logs:</strong> up to 30 days at Vercel.
          </li>
        </ul>

        <h2>5. Third-party processors</h2>
        <p>
          We share personal data with the following processors, all bound by
          data processing agreements (DPAs) and appropriate safeguards for
          international transfers:
        </p>
        <ul>
          <li>
            <strong>Supabase Inc.</strong> (United States) — database, storage,
            and authentication. Stores newsletter subscribers, accounts,
            specialist profiles. DPA in place; data resides in their US
            region.
          </li>
          <li>
            <strong>Vercel Inc.</strong> (United States) — hosting, edge
            network, server logs. DPA in place.
          </li>
          <li>
            <strong>Google LLC</strong> (United States) — Google Analytics 4
            (only when you consent), Google Search Console for crawl
            reporting. DPA in place; reliance on the EU-US Data Privacy
            Framework certification.
          </li>
          <li>
            <strong>Resend Inc.</strong> (United States) — transactional and
            newsletter email delivery. DPA in place.
          </li>
        </ul>

        <h2>6. International data transfers</h2>
        <p>
          Because our processors are based in the United States, your data
          is transferred outside the European Economic Area, the United
          Kingdom, and Canada. We rely on the EU-US Data Privacy Framework
          (where applicable) and Standard Contractual Clauses to ensure your
          data receives equivalent protection. You can request copies of the
          relevant safeguards by emailing{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <h2>7. Your rights</h2>
        <p>
          You have the following rights under GDPR and Quebec Law 25. To
          exercise any of them, email us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We will
          respond within 30 days.
        </p>
        <ul>
          <li>
            <strong>Right of access:</strong> request a copy of the personal
            data we hold about you.
          </li>
          <li>
            <strong>Right to rectification:</strong> ask us to correct
            inaccurate or incomplete data.
          </li>
          <li>
            <strong>Right to erasure:</strong> request deletion of your data
            (also known as the &ldquo;right to be forgotten&rdquo;).
          </li>
          <li>
            <strong>Right to restriction of processing:</strong> ask us to
            pause processing of your data while a dispute is resolved.
          </li>
          <li>
            <strong>Right to data portability:</strong> receive your data in
            a structured, commonly used, machine-readable format.
          </li>
          <li>
            <strong>Right to object:</strong> object to processing based on
            legitimate interests.
          </li>
          <li>
            <strong>Right to withdraw consent:</strong> at any time, with
            effect for the future, where processing is based on consent.
          </li>
          <li>
            <strong>Right to lodge a complaint</strong> with the supervisory
            authority in your jurisdiction (see section 11).
          </li>
        </ul>

        <h2>8. Editorial standards and automated processing</h2>
        <p>
          Our editorial team uses modern research and writing tools,
          including AI assistants, to accelerate the work of our curators.
          Every article is reviewed and signed off by a named curator before
          publication. Editorial direction, sourcing standards, and final
          publication decisions are made by our human editorial team.
        </p>
        <p>
          Importantly, we do <strong>not</strong> make automated decisions
          about individual users. We do not score, profile, or target you
          with personalised ads. The tools we use serve our curators, not
          your data.
        </p>

        <h2>9. Children&rsquo;s data</h2>
        <p>
          Particle Post is not directed at children under 16 and we do not
          knowingly collect personal data from anyone under 16. If you
          believe a child has provided us with personal data, please contact
          us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and
          we will delete it.
        </p>

        <h2>10. Security measures</h2>
        <p>
          We use HTTPS site-wide, modern security headers (Strict Transport
          Security, Content Security Policy, X-Frame-Options), Supabase
          row-level security on all user-data tables, and secure password
          hashing via Supabase Auth. Service-role keys and other secrets are
          never exposed to the client and are stored in encrypted GitHub
          Actions and Vercel environment variables.
        </p>

        <h2>11. Complaint procedures</h2>
        <ul>
          <li>
            <strong>EU residents</strong> may lodge a complaint with their
            national data protection authority. A list is maintained by the
            European Data Protection Board.
          </li>
          <li>
            <strong>UK residents</strong> may complain to the Information
            Commissioner&rsquo;s Office (ICO) at{" "}
            <a href="https://ico.org.uk/">ico.org.uk</a>.
          </li>
          <li>
            <strong>Quebec residents</strong> may complain to the Commission
            d&rsquo;accès à l&rsquo;information du Québec (CAI) at{" "}
            <a href="https://www.cai.gouv.qc.ca/">cai.gouv.qc.ca</a>.
          </li>
          <li>
            <strong>All other residents</strong> may contact us first at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and, if
            unresolved, escalate to your local supervisory authority.
          </li>
        </ul>

        <h2>12. Updates to this policy</h2>
        <p>
          We may update this policy to reflect changes in our practices or
          legal requirements. The &ldquo;Last updated&rdquo; date at the top
          of this page reflects the most recent revision. Material changes
          will be communicated via the newsletter (for subscribers) or via a
          banner on the site for at least 14 days before taking effect.
        </p>

        <h2>13. Contact</h2>
        <p>
          For any privacy enquiry, request, or complaint, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We aim to
          respond within five business days, and within 30 days at the
          outside as required by GDPR Article 12.
        </p>
      </div>
    </div>
  );
}
