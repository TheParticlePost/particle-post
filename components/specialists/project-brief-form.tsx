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
} from "@/lib/specialists/constants";

const inputStyles = cn(
  "w-full px-4 py-2.5 rounded-lg bg-bg-high/50 border border-border-ghost",
  "text-body-sm text-text-primary placeholder:text-text-muted",
  "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
  "transition-all duration-200"
);

const labelStyles = "block text-body-sm text-text-secondary mb-1.5";

export function ProjectBriefForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    client_company: "",
    categories: [] as string[],
    industries: [] as string[],
    country_code: "US",
    languages: ["en"] as string[],
    budget_range: "",
    timeline: "",
    project_description: "",
  });

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
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/automatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Submission failed");
      }

      const data = await res.json();
      router.push(`/specialists/match/${data.brief_id}/`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-article mx-auto space-y-8">
      {/* Contact Info */}
      <section className="space-y-4">
        <h2 className="font-display font-bold text-display-sm text-text-primary">
          Your Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelStyles}>Name *</label>
            <input type="text" name="client_name" required value={form.client_name} onChange={handleChange} placeholder="Jane Smith" className={inputStyles} />
          </div>
          <div>
            <label className={labelStyles}>Email *</label>
            <input type="email" name="client_email" required value={form.client_email} onChange={handleChange} placeholder="jane@company.com" className={inputStyles} />
          </div>
        </div>
        <div>
          <label className={labelStyles}>Company</label>
          <input type="text" name="client_company" value={form.client_company} onChange={handleChange} placeholder="Acme Corp" className={inputStyles} />
        </div>
      </section>

      {/* What you need */}
      <section className="space-y-4">
        <h2 className="font-display font-bold text-display-sm text-text-primary">
          What You Need
        </h2>
        <div>
          <label className={labelStyles}>Expertise Areas * (select up to 3)</label>
          <div className="flex flex-wrap gap-2">
            {SPECIALIST_CATEGORIES.map((cat) => (
              <button key={cat.slug} type="button" onClick={() => toggleArrayItem("categories", cat.slug)}
                className={cn("px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors border",
                  form.categories.includes(cat.slug) ? "border-accent bg-accent/10 text-accent" : "border-border-ghost bg-bg-high/50 text-text-secondary hover:text-text-primary")}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelStyles}>Industries</label>
          <div className="flex flex-wrap gap-2">
            {SPECIALIST_INDUSTRIES.map((ind) => (
              <button key={ind} type="button" onClick={() => toggleArrayItem("industries", ind)}
                className={cn("px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors border",
                  form.industries.includes(ind) ? "border-accent bg-accent/10 text-accent" : "border-border-ghost bg-bg-high/50 text-text-secondary hover:text-text-primary")}>
                {ind}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelStyles}>Project Description *</label>
          <textarea name="project_description" required rows={5} value={form.project_description} onChange={handleChange}
            placeholder="Describe your project goals, current state, and what kind of specialist help you need..."
            className={inputStyles} />
        </div>
      </section>

      {/* Preferences */}
      <section className="space-y-4">
        <h2 className="font-display font-bold text-display-sm text-text-primary">
          Preferences
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelStyles}>Preferred Country</label>
            <select name="country_code" value={form.country_code} onChange={handleChange} className={inputStyles}>
              <option value="">No preference</option>
              {COUNTRIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
            </select>
          </div>
          <div>
            <label className={labelStyles}>Budget Range</label>
            <select name="budget_range" value={form.budget_range} onChange={handleChange} className={inputStyles}>
              <option value="">Select budget</option>
              {RATE_RANGES.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelStyles}>Timeline</label>
            <select name="timeline" value={form.timeline} onChange={handleChange} className={inputStyles}>
              <option value="">Select timeline</option>
              <option value="asap">ASAP</option>
              <option value="1-2-weeks">1-2 weeks</option>
              <option value="1-month">Within a month</option>
              <option value="3-months">Within 3 months</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>
          <div>
            <label className={labelStyles}>Languages</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.slice(0, 5).map((lang) => (
                <button key={lang.value} type="button" onClick={() => toggleArrayItem("languages", lang.value)}
                  className={cn("px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors border",
                    form.languages.includes(lang.value) ? "border-accent bg-accent/10 text-accent" : "border-border-ghost bg-bg-high/50 text-text-secondary")}>
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {error && <p className="text-body-sm text-[#D14040]">{error}</p>}

      <Button type="submit" size="hero" disabled={loading}>
        {loading ? "Finding Specialists..." : "Find Matching Specialists"}
      </Button>
    </form>
  );
}
