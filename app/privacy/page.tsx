import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Particle Post privacy policy and data handling practices.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-display-lg mb-8">Privacy Policy</h1>
      <div className="prose">
        <p className="text-foreground-secondary text-body-sm mb-8">
          Last updated: March 2026
        </p>

        <h2>Information We Collect</h2>
        <p>
          When you subscribe to our newsletter, we collect your email address.
          We use Google Analytics to understand how visitors interact with our
          site, which collects anonymized usage data.
        </p>

        <h2>How We Use Your Information</h2>
        <p>
          Your email address is used solely to deliver our newsletter. Analytics
          data helps us improve content quality and site performance. We do not
          sell or share your personal information with third parties.
        </p>

        <h2>Data Storage</h2>
        <p>
          Newsletter subscriber data is stored securely on Supabase with
          row-level security enabled. Analytics data is processed by Google
          Analytics.
        </p>

        <h2>Your Rights</h2>
        <p>
          You can unsubscribe from our newsletter at any time using the link in
          any email. To request data deletion, contact us directly.
        </p>

        <h2>Cookies</h2>
        <p>
          We use essential cookies and optional analytics cookies. You can
          manage your cookie preferences through the consent banner.
        </p>

        <h2>Contact</h2>
        <p>
          For privacy inquiries, please visit our About page for contact
          information.
        </p>
      </div>
    </div>
  );
}
