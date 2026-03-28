import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Particle Post cookie policy and tracking preferences.",
};

export default function CookiesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-display text-display-lg mb-8">Cookie Policy</h1>
      <div className="prose">
        <p className="text-text-secondary text-body-sm mb-8">
          Last updated: March 2026
        </p>

        <h2>What Are Cookies</h2>
        <p>
          Cookies are small text files stored on your device when you visit a
          website. They help the site remember your preferences and improve your
          experience.
        </p>

        <h2>Cookies We Use</h2>
        <h3>Essential Cookies</h3>
        <p>
          These are necessary for the site to function, including theme
          preference (dark/light mode) stored in localStorage.
        </p>

        <h3>Analytics Cookies</h3>
        <p>
          We use Google Analytics (GA4) to understand how visitors use our
          site. These cookies are only set with your consent and collect
          anonymized data about page views and interactions.
        </p>

        <h2>Managing Cookies</h2>
        <p>
          You can manage cookie preferences through the consent banner that
          appears on your first visit. You can also clear cookies through your
          browser settings at any time.
        </p>
      </div>
    </div>
  );
}
