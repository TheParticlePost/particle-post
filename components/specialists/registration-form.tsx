"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  SPECIALIST_CATEGORIES,
  SPECIALIST_INDUSTRIES,
  COUNTRIES,
  LANGUAGES,
  RATE_RANGES,
  TEAM_SIZES,
} from "@/lib/specialists/constants";

const inputStyles = cn(
  "w-full px-4 py-2.5 rounded-lg bg-bg-high/50 border border-border-ghost",
  "text-body-sm text-text-primary placeholder:text-text-muted",
  "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
  "transition-all duration-200"
);

const labelStyles = "block text-body-sm text-text-secondary mb-1.5";

export function RegistrationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    type: "individual" as "individual" | "firm",
    display_name: "",
    headline: "",
    bio: "",
    avatar_url: "",
    categories: [] as string[],
    industries: [] as string[],
    location_city: "",
    country_code: "US",
    languages: ["en"] as string[],
    hourly_rate_range: "",
    team_size: "",
    certifications: "",
    linkedin_url: "",
    website_url: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function toggleArrayItem(field: "categories" | "industries" | "languages", value: string) {
    setFormData((prev) => {
      const arr = prev[field];
      const maxItems = field === "categories" ? 3 : field === "industries" ? 5 : 10;
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter((v) => v !== value) };
      }
      if (arr.length >= maxItems) return prev;
      return { ...prev, [field]: [...arr, value] };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const body = {
        ...formData,
        certifications: formData.certifications
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const res = await fetch("/api/specialists/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-article mx-auto py-16 text-center">
        <h2 className="font-display font-bold text-display-md text-text-primary">
          Profile Submitted
        </h2>
        <p className="text-body-md text-text-secondary mt-3">
          Your specialist profile is pending review. We will notify you once
          it has been approved and published in the directory.
        </p>
        <Button
          variant="secondary"
          className="mt-6"
          onClick={() => router.push("/")}
        >
          Return Home
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-article mx-auto space-y-10">
      {/* Type */}
      <section className="space-y-4">
        <h2 className="font-display font-bold text-display-sm text-text-primary">
          Profile Type
        </h2>
        <div className="flex gap-3">
          {(["individual", "firm"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFormData((p) => ({ ...p, type: t }))}
              className={cn(
                "px-4 py-2 rounded-lg text-body-sm font-medium transition-colors",
                formData.type === t
                  ? "bg-accent text-[#F5F0EB]"
                  : "bg-bg-high text-text-secondary hover:text-text-primary"
              )}
            >
              {t === "individual" ? "Individual" : "Firm / Agency"}
            </button>
          ))}
        </div>
      </section>

      {/* Basic Info */}
      <section className="space-y-4">
        <h2 className="font-display font-bold text-display-sm text-text-primary">
          Basic Information
        </h2>
        <div>
          <label className={labelStyles}>Display Name *</label>
          <input
            type="text"
            name="display_name"
            required
            value={formData.display_name}
            onChange={handleChange}
            placeholder={formData.type === "firm" ? "Company name" : "Your full name"}
            className={inputStyles}
          />
        </div>
        <div>
          <label className={labelStyles}>Headline *</label>
          <input
            type="text"
            name="headline"
            required
            maxLength={120}
            value={formData.headline}
            onChange={handleChange}
            placeholder="AI Strategy Consultant for Financial Services"
            className={inputStyles}
          />
        </div>
        <div>
          <label className={labelStyles}>Bio</label>
          <textarea
            name="bio"
            rows={4}
            maxLength={500}
            value={formData.bio}
            onChange={handleChange}
            placeholder="Tell potential clients about your experience and approach..."
            className={inputStyles}
          />
          <p className="text-caption text-text-muted mt-1">
            {formData.bio.length}/500 characters
          </p>
        </div>
        <div>
          <label className={labelStyles}>Avatar / Logo URL</label>
          <input
            type="url"
            name="avatar_url"
            value={formData.avatar_url}
            onChange={handleChange}
            placeholder="https://..."
            className={inputStyles}
          />
        </div>
      </section>

      {/* Expertise */}
      <section className="space-y-4">
        <h2 className="font-display font-bold text-display-sm text-text-primary">
          Expertise
        </h2>
        <div>
          <label className={labelStyles}>
            Categories * (select up to 3)
          </label>
          <div className="flex flex-wrap gap-2">
            {SPECIALIST_CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                type="button"
                onClick={() => toggleArrayItem("categories", cat.slug)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors border",
                  formData.categories.includes(cat.slug)
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border-ghost bg-bg-high/50 text-text-secondary hover:text-text-primary"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelStyles}>
            Industries (select up to 5)
          </label>
          <div className="flex flex-wrap gap-2">
            {SPECIALIST_INDUSTRIES.map((ind) => (
              <button
                key={ind}
                type="button"
                onClick={() => toggleArrayItem("industries", ind)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors border",
                  formData.industries.includes(ind)
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border-ghost bg-bg-high/50 text-text-secondary hover:text-text-primary"
                )}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelStyles}>Certifications (comma-separated)</label>
          <input
            type="text"
            name="certifications"
            value={formData.certifications}
            onChange={handleChange}
            placeholder="AWS ML Specialty, Google Cloud AI, Azure AI Engineer"
            className={inputStyles}
          />
        </div>
      </section>

      {/* Location */}
      <section className="space-y-4">
        <h2 className="font-display font-bold text-display-sm text-text-primary">
          Location
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelStyles}>City *</label>
            <input
              type="text"
              name="location_city"
              required
              value={formData.location_city}
              onChange={handleChange}
              placeholder="San Francisco"
              className={inputStyles}
            />
          </div>
          <div>
            <label className={labelStyles}>Country *</label>
            <select
              name="country_code"
              value={formData.country_code}
              onChange={handleChange}
              className={inputStyles}
            >
              {COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelStyles}>Languages</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                type="button"
                onClick={() => toggleArrayItem("languages", lang.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors border",
                  formData.languages.includes(lang.value)
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border-ghost bg-bg-high/50 text-text-secondary hover:text-text-primary"
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Rates & Details */}
      <section className="space-y-4">
        <h2 className="font-display font-bold text-display-sm text-text-primary">
          Rates & Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelStyles}>Hourly Rate Range</label>
            <select
              name="hourly_rate_range"
              value={formData.hourly_rate_range}
              onChange={handleChange}
              className={inputStyles}
            >
              <option value="">Prefer not to say</option>
              {RATE_RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {formData.type === "firm" && (
            <div>
              <label className={labelStyles}>Team Size</label>
              <select
                name="team_size"
                value={formData.team_size}
                onChange={handleChange}
                className={inputStyles}
              >
                <option value="">Select team size</option>
                {TEAM_SIZES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Contact */}
      <section className="space-y-4">
        <h2 className="font-display font-bold text-display-sm text-text-primary">
          Contact & Links
        </h2>
        <div>
          <label className={labelStyles}>LinkedIn Profile URL *</label>
          <input
            type="url"
            name="linkedin_url"
            required
            value={formData.linkedin_url}
            onChange={handleChange}
            placeholder="https://linkedin.com/in/yourprofile"
            className={inputStyles}
          />
        </div>
        <div>
          <label className={labelStyles}>Website</label>
          <input
            type="url"
            name="website_url"
            value={formData.website_url}
            onChange={handleChange}
            placeholder="https://yoursite.com"
            className={inputStyles}
          />
        </div>
      </section>

      {error && (
        <p className="text-body-sm text-[#D14040]">{error}</p>
      )}

      <div className="pt-4 border-t border-border-ghost">
        <Button type="submit" size="hero" disabled={loading}>
          {loading ? "Submitting..." : "Submit for Review"}
        </Button>
        <p className="text-caption text-text-muted mt-3">
          Your profile will be reviewed before appearing in the directory.
        </p>
      </div>
    </form>
  );
}
