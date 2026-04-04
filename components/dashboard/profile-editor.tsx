"use client";

import { useState, useEffect } from "react";
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
import type { Specialist } from "@/lib/specialists/types";

const inputStyles = cn(
  "w-full px-4 py-2.5 rounded-lg bg-bg-high/50 border border-border-ghost",
  "text-body-sm text-text-primary placeholder:text-text-muted",
  "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
  "transition-all duration-200"
);

const labelStyles = "block text-body-sm text-text-secondary mb-1.5";

export function ProfileEditor() {
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({
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

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard/profile");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        const s = data.specialist as Specialist;
        setSpecialist(s);
        setForm({
          display_name: s.display_name,
          headline: s.headline,
          bio: s.bio || "",
          avatar_url: s.avatar_url || "",
          categories: s.categories,
          industries: s.industries,
          location_city: s.location_city,
          country_code: s.country_code,
          languages: s.languages,
          hourly_rate_range: s.hourly_rate_range || "",
          team_size: s.team_size || "",
          certifications: s.certifications.join(", "),
          linkedin_url: s.linkedin_url,
          website_url: s.website_url || "",
        });
      } catch {
        setMessage({ type: "error", text: "Failed to load profile" });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function toggleArrayItem(field: "categories" | "industries" | "languages", value: string) {
    setForm((prev) => {
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
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          certifications: form.certifications
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Update failed");
      }

      setMessage({ type: "success", text: "Profile updated" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Update failed",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-text-muted text-body-sm py-8 text-center">Loading...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {specialist && (
        <div className="flex items-center gap-2 text-body-sm">
          <a
            href={`/specialists/${specialist.slug}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            View public profile
          </a>
        </div>
      )}

      {message && (
        <p
          className={cn(
            "text-body-sm",
            message.type === "success" ? "text-[#2D9B5A]" : "text-[#D14040]"
          )}
        >
          {message.text}
        </p>
      )}

      {/* Basic Info */}
      <section className="space-y-4">
        <h3 className="font-display font-bold text-body-md text-text-primary">
          Basic Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelStyles}>Display Name</label>
            <input
              type="text"
              name="display_name"
              value={form.display_name}
              onChange={handleChange}
              className={inputStyles}
            />
          </div>
          <div>
            <label className={labelStyles}>Avatar URL</label>
            <input
              type="url"
              name="avatar_url"
              value={form.avatar_url}
              onChange={handleChange}
              className={inputStyles}
            />
          </div>
        </div>
        <div>
          <label className={labelStyles}>Headline</label>
          <input
            type="text"
            name="headline"
            maxLength={120}
            value={form.headline}
            onChange={handleChange}
            className={inputStyles}
          />
        </div>
        <div>
          <label className={labelStyles}>Bio</label>
          <textarea
            name="bio"
            rows={4}
            maxLength={500}
            value={form.bio}
            onChange={handleChange}
            className={inputStyles}
          />
        </div>
      </section>

      {/* Expertise */}
      <section className="space-y-4">
        <h3 className="font-display font-bold text-body-md text-text-primary">
          Expertise
        </h3>
        <div>
          <label className={labelStyles}>Categories (up to 3)</label>
          <div className="flex flex-wrap gap-2">
            {SPECIALIST_CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                type="button"
                onClick={() => toggleArrayItem("categories", cat.slug)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors border",
                  form.categories.includes(cat.slug)
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border-ghost bg-bg-high/50 text-text-secondary"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelStyles}>Industries (up to 5)</label>
          <div className="flex flex-wrap gap-2">
            {SPECIALIST_INDUSTRIES.map((ind) => (
              <button
                key={ind}
                type="button"
                onClick={() => toggleArrayItem("industries", ind)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors border",
                  form.industries.includes(ind)
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border-ghost bg-bg-high/50 text-text-secondary"
                )}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelStyles}>Certifications</label>
          <input
            type="text"
            name="certifications"
            value={form.certifications}
            onChange={handleChange}
            placeholder="Comma-separated"
            className={inputStyles}
          />
        </div>
      </section>

      {/* Location */}
      <section className="space-y-4">
        <h3 className="font-display font-bold text-body-md text-text-primary">
          Location & Languages
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelStyles}>City</label>
            <input type="text" name="location_city" value={form.location_city} onChange={handleChange} className={inputStyles} />
          </div>
          <div>
            <label className={labelStyles}>Country</label>
            <select name="country_code" value={form.country_code} onChange={handleChange} className={inputStyles}>
              {COUNTRIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelStyles}>Languages</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <button key={lang.value} type="button" onClick={() => toggleArrayItem("languages", lang.value)}
                className={cn("px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors border",
                  form.languages.includes(lang.value) ? "border-accent bg-accent/10 text-accent" : "border-border-ghost bg-bg-high/50 text-text-secondary")}>
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Rates */}
      <section className="space-y-4">
        <h3 className="font-display font-bold text-body-md text-text-primary">Rates & Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelStyles}>Rate Range</label>
            <select name="hourly_rate_range" value={form.hourly_rate_range} onChange={handleChange} className={inputStyles}>
              <option value="">Prefer not to say</option>
              {RATE_RANGES.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
            </select>
          </div>
          {specialist?.type === "firm" && (
            <div>
              <label className={labelStyles}>Team Size</label>
              <select name="team_size" value={form.team_size} onChange={handleChange} className={inputStyles}>
                <option value="">Select</option>
                {TEAM_SIZES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
              </select>
            </div>
          )}
        </div>
        <div>
          <label className={labelStyles}>LinkedIn URL</label>
          <input type="url" name="linkedin_url" value={form.linkedin_url} onChange={handleChange} className={inputStyles} />
        </div>
        <div>
          <label className={labelStyles}>Website</label>
          <input type="url" name="website_url" value={form.website_url} onChange={handleChange} className={inputStyles} />
        </div>
      </section>

      <Button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
