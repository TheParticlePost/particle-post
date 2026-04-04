"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RATE_RANGES } from "@/lib/specialists/constants";

const inputStyles = cn(
  "w-full px-4 py-2.5 rounded-lg bg-bg-high/50 border border-border-ghost",
  "text-body-sm text-text-primary placeholder:text-text-muted",
  "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
  "transition-all duration-200"
);

interface ContactFormProps {
  specialistSlug: string;
  specialistName: string;
}

export function ContactForm({ specialistSlug, specialistName }: ContactFormProps) {
  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    client_company: "",
    project_description: "",
    budget_range: "",
    timeline: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/specialists/${specialistSlug}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send message");
      }

      setStatus("success");
      setFormData({
        client_name: "",
        client_email: "",
        client_company: "",
        project_description: "",
        budget_range: "",
        timeline: "",
      });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-bg-container border border-border-ghost rounded-lg p-6 text-center">
        <p className="text-text-primary font-display font-bold text-body-md">
          Message sent
        </p>
        <p className="text-text-secondary text-body-sm mt-2">
          {specialistName} will receive your inquiry and respond directly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-body-sm text-text-secondary mb-1.5">
            Your Name *
          </label>
          <input
            type="text"
            name="client_name"
            required
            value={formData.client_name}
            onChange={handleChange}
            placeholder="Jane Smith"
            className={inputStyles}
          />
        </div>
        <div>
          <label className="block text-body-sm text-text-secondary mb-1.5">
            Email *
          </label>
          <input
            type="email"
            name="client_email"
            required
            value={formData.client_email}
            onChange={handleChange}
            placeholder="jane@company.com"
            className={inputStyles}
          />
        </div>
      </div>

      <div>
        <label className="block text-body-sm text-text-secondary mb-1.5">
          Company
        </label>
        <input
          type="text"
          name="client_company"
          value={formData.client_company}
          onChange={handleChange}
          placeholder="Acme Corp"
          className={inputStyles}
        />
      </div>

      <div>
        <label className="block text-body-sm text-text-secondary mb-1.5">
          Project Description *
        </label>
        <textarea
          name="project_description"
          required
          rows={4}
          value={formData.project_description}
          onChange={handleChange}
          placeholder="Describe your project, goals, and what kind of help you need..."
          className={inputStyles}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-body-sm text-text-secondary mb-1.5">
            Budget Range
          </label>
          <select
            name="budget_range"
            value={formData.budget_range}
            onChange={handleChange}
            className={inputStyles}
          >
            <option value="">Select budget range</option>
            {RATE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-body-sm text-text-secondary mb-1.5">
            Timeline
          </label>
          <select
            name="timeline"
            value={formData.timeline}
            onChange={handleChange}
            className={inputStyles}
          >
            <option value="">Select timeline</option>
            <option value="asap">ASAP</option>
            <option value="1-2-weeks">1-2 weeks</option>
            <option value="1-month">Within a month</option>
            <option value="3-months">Within 3 months</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>
      </div>

      {status === "error" && (
        <p className="text-body-sm text-[#D14040]">{errorMsg}</p>
      )}

      <Button type="submit" disabled={status === "loading"} className="w-full md:w-auto">
        {status === "loading" ? "Sending..." : "Send Inquiry"}
      </Button>
    </form>
  );
}
