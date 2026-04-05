"""
Case Study Publisher — extracts structured data from a published case study
article and inserts it into the Supabase pulse_case_studies table so it
appears on the AI Pulse map with a geocoded marker.

Uses only stdlib (urllib + json) — no extra dependencies.
"""

from __future__ import annotations

import json
import os
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from pipeline.utils.geocoder import geocode_company


def publish_case_study_to_pulse(
    article_content: str,
    seo_data: dict,
    slug: str,
) -> None:
    """Extract case study metadata and insert into pulse_case_studies.

    Args:
        article_content: The full formatted article (with frontmatter).
        seo_data: SEO data dict from the pipeline (title, tags, categories, etc.).
        slug: The article slug.
    """
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not url or not key:
        print("  [Pulse] Supabase not configured, skipping case study insert")
        return

    # Extract company name from title
    title = seo_data.get("meta_title", "") or _extract_frontmatter(article_content, "title")
    company = _extract_company(title)
    if not company:
        print(f"  [Pulse] Could not extract company from title: {title}")
        return

    # Geocode the company
    geo = geocode_company(company)
    if not geo:
        print(f"  [Pulse] Could not geocode company: {company}")
        return

    # Extract outcome metric (first STAT: line or first bold metric in results section)
    outcome_metric = _extract_outcome_metric(article_content)

    # Extract numeric value from outcome metric
    outcome_value = _extract_numeric(outcome_metric)

    # Industry from categories or tags
    categories = seo_data.get("categories", [])
    tags = seo_data.get("tags", [])
    industry = _classify_industry(categories, tags)

    # Build the headline (description, truncated)
    description = seo_data.get("meta_description", "") or _extract_frontmatter(article_content, "description")
    headline = description[:120] if description else title[:120]

    # Cover image URL
    cover_url = _extract_frontmatter(article_content, "image") or ""

    row = {
        "company": company,
        "country_code": geo["country_code"],
        "lat": geo["lat"],
        "lng": geo["lng"],
        "industry": industry,
        "headline": headline,
        "outcome_metric": outcome_metric or "See article",
        "outcome_value": outcome_value,
        "slug": slug,
        "image_url": cover_url if cover_url else None,
        "featured": False,
    }

    # Insert via Supabase REST API
    api_url = f"{url}/rest/v1/pulse_case_studies"
    body = json.dumps(row, ensure_ascii=False).encode("utf-8")

    req = Request(
        api_url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )

    try:
        with urlopen(req, timeout=30) as resp:
            if resp.status in (200, 201):
                print(f"  [Pulse] Case study inserted: {company} ({geo['country_code']}) at ({geo['lat']}, {geo['lng']})")
                return
            print(f"  [Pulse] Unexpected status {resp.status}")
    except HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")[:200] if hasattr(exc, "read") else ""
        print(f"  [Pulse] HTTP {exc.code}: {exc.reason} — {body_text}")
    except URLError as exc:
        print(f"  [Pulse] Network error: {exc.reason}")
    except Exception as exc:
        print(f"  [Pulse] Insert failed: {exc}")


def _extract_company(title: str) -> str:
    """Extract company name from a case study title.

    Patterns:
    - "How [Company] Cut/Reduced/Deployed/Achieved ..."
    - "[Company] AI/Case Study: ..."
    - "How a $50M [Type] Deployed ..." → skip these (no specific company)
    """
    # Pattern: "How [Company] [Verb]..."
    m = re.match(r"(?:How\s+)?([A-Z][A-Za-z0-9\s&.']+?)\s+(?:Cut|Reduce|Deploy|Achieve|Save|Built|Launch|Implement|Transform|Automat|Slash|Boost|Lower|Scale)", title)
    if m:
        company = m.group(1).strip()
        # Filter out generic phrases
        if company.lower() not in ("a", "the", "one", "this", "how"):
            return company

    # Pattern: "[Company] AI/Case Study:"
    m = re.match(r"([A-Z][A-Za-z0-9\s&.']+?)\s+(?:AI|Case Study|Customer|Fraud|Contract)", title)
    if m:
        company = m.group(1).strip()
        if len(company) > 2:
            return company

    # Pattern: title contains a known company-like word (capitalized, 2+ words)
    words = title.split()
    for i, w in enumerate(words):
        if w[0].isupper() and i > 0 and len(w) > 2:
            # Check if previous word is "How" or start of sentence
            if words[i - 1].lower() in ("how", "why", "when", "what"):
                # Collect consecutive capitalized words
                company_parts = []
                for j in range(i, min(i + 4, len(words))):
                    if words[j][0].isupper() or words[j] in ("&", "of", "the"):
                        company_parts.append(words[j])
                    else:
                        break
                if company_parts:
                    return " ".join(company_parts)

    return ""


def _extract_outcome_metric(content: str) -> str:
    """Extract the primary outcome metric from the article body."""
    # Try STAT: format first
    m = re.search(r"STAT:\s*([^|]+)\s*\|", content)
    if m:
        return m.group(1).strip()

    # Try "Results" section with bold metrics
    m = re.search(r"(?:Results|Outcome|Impact).*?(\$[\d,.]+[BMK]?\s+\w+|\d+%\s+\w+)", content, re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(1).strip()

    # Try any percentage or dollar figure in first 2000 chars
    m = re.search(r"(\$[\d,.]+\s*(?:billion|million|B|M|K)?|\d+(?:\.\d+)?%)\s+(?:reduction|savings?|improvement|faster|less|more|increase|decrease|cut)", content[:2000], re.IGNORECASE)
    if m:
        return m.group(0).strip()

    return ""


def _extract_numeric(metric: str) -> float | None:
    """Extract a numeric value from an outcome metric string."""
    if not metric:
        return None
    m = re.search(r"([\d,.]+)", metric)
    if m:
        try:
            return float(m.group(1).replace(",", ""))
        except ValueError:
            pass
    return None


def _extract_frontmatter(content: str, field: str) -> str:
    """Extract a field value from YAML frontmatter."""
    m = re.search(rf'^{field}:\s*"?([^"\n]+)"?\s*$', content, re.MULTILINE)
    return m.group(1).strip() if m else ""


def _classify_industry(categories: list[str], tags: list[str]) -> str:
    """Map article categories/tags to a broad industry label."""
    all_text = " ".join(c.lower() for c in categories + tags)
    if any(k in all_text for k in ("finance", "banking", "payment", "fintech")):
        return "Financial Services"
    if any(k in all_text for k in ("health", "medical", "clinical", "pharma")):
        return "Healthcare"
    if any(k in all_text for k in ("manufactur", "production", "factory", "industrial")):
        return "Manufacturing"
    if any(k in all_text for k in ("retail", "commerce", "shop")):
        return "Retail & E-commerce"
    if any(k in all_text for k in ("logistics", "supply chain", "shipping", "warehouse")):
        return "Transportation"
    if any(k in all_text for k in ("energy", "oil", "gas", "utility")):
        return "Energy & Utilities"
    if any(k in all_text for k in ("telecom", "network")):
        return "Telecom"
    if any(k in all_text for k in ("government", "public sector")):
        return "Government"
    return "Technology"
