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

from pipeline.utils.geocoder import geocode_company, known_companies


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
        _log_pulse_failure(slug, "supabase_not_configured", "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing")
        print("  [Pulse] Supabase not configured, skipping case study insert")
        return

    # Extract company name: slug first (most reliable), then title regex
    title = seo_data.get("meta_title", "") or _extract_frontmatter(article_content, "title")
    company = _extract_company(title, slug)
    if not company:
        _log_pulse_failure(slug, "no_company_extracted", f"title={title!r}")
        print(f"  [Pulse] Could not extract company from slug={slug} title={title!r}")
        return

    # Geocode the company
    geo = geocode_company(company)
    if not geo:
        _log_pulse_failure(slug, "no_geocode", f"company={company!r}")
        print(f"  [Pulse] Could not geocode company: {company} (add it to pipeline/utils/geocoder.py)")
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

    insert_ok = False
    try:
        with urlopen(req, timeout=30) as resp:
            if resp.status in (200, 201):
                print(f"  [Pulse] Case study inserted: {company} ({geo['country_code']}) at ({geo['lat']}, {geo['lng']})")
                insert_ok = True
            else:
                print(f"  [Pulse] Unexpected status {resp.status}")
                _log_pulse_failure(slug, "unexpected_status", f"status={resp.status}")
    except HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")[:200] if hasattr(exc, "read") else ""
        # A unique-constraint violation on slug means the row already exists — treat as success
        if exc.code == 409 or "duplicate" in body_text.lower() or "unique" in body_text.lower():
            print(f"  [Pulse] Row already exists for slug={slug} (treated as success)")
            insert_ok = True
        else:
            print(f"  [Pulse] HTTP {exc.code}: {exc.reason} — {body_text}")
            _log_pulse_failure(slug, f"http_{exc.code}", body_text[:200])
    except URLError as exc:
        print(f"  [Pulse] Network error: {exc.reason}")
        _log_pulse_failure(slug, "network_error", str(exc.reason))
    except Exception as exc:
        print(f"  [Pulse] Insert failed: {exc}")
        _log_pulse_failure(slug, "exception", str(exc)[:200])

    # Post-insert verification: query the table to confirm the row landed
    if insert_ok:
        if not _verify_row_exists(url, key, slug):
            print(f"  [Pulse] WARNING: insert claimed success but no row found for slug={slug}")
            _log_pulse_failure(slug, "post_insert_verify_failed", "row not found after successful POST")


def _extract_company(title: str, slug: str = "") -> str:
    """Extract company name from a case study article.

    Strategy (in order):
      1. Slug-first: scan slug segments and slug-as-phrase against the
         geocoder's known-companies list. This is the most reliable
         signal because slugs are kebab-case and usually start with the
         company name.
      2. Title regex patterns (legacy fallback for edge cases).

    Returning a value that matches a known geocoder key guarantees the
    downstream geocode_company() call will succeed.
    """
    # --- 1. Slug-first match against known companies ---
    if slug:
        slug_lower = slug.lower().replace("_", "-")
        segments = slug_lower.split("-")
        seg_set = set(segments)
        known = known_companies()

        # Prefer longest-known-company-name match so "jpmorgan chase"
        # wins over "jpmorgan" when both are present.
        # Sort known keys by descending length so multi-word names match first.
        for key in sorted(known, key=len, reverse=True):
            key_lower = key.lower()
            # Multi-word key: check the full slug-as-phrase (with spaces)
            if " " in key_lower:
                if key_lower in slug_lower.replace("-", " "):
                    return _canonical_company_name(key)
            else:
                # Single word: must appear as a complete slug segment
                if key_lower in seg_set:
                    return _canonical_company_name(key)

    # --- 2. Title regex fallback (legacy heuristics) ---
    # Pattern: "How [Company] [Verb]..."
    m = re.match(r"(?:How\s+)?([A-Z][A-Za-z0-9\s&.']+?)\s+(?:Cut|Reduce|Deploy|Achieve|Save|Built|Launch|Implement|Transform|Automat|Slash|Boost|Lower|Scale)", title)
    if m:
        company = m.group(1).strip()
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
            if words[i - 1].lower() in ("how", "why", "when", "what"):
                company_parts = []
                for j in range(i, min(i + 4, len(words))):
                    if words[j][0].isupper() or words[j] in ("&", "of", "the"):
                        company_parts.append(words[j])
                    else:
                        break
                if company_parts:
                    return " ".join(company_parts)

    return ""


# Companies whose canonical branding differs from simple title-case.
# Extend as needed.
_BRAND_OVERRIDES = {
    "jpmorgan": "JPMorgan",
    "jpmorgan chase": "JPMorgan Chase",
    "hsbc": "HSBC",
    "dbs": "DBS",
    "dbs bank": "DBS Bank",
    "bp": "BP",
    "ups": "UPS",
    "dhl": "DHL",
    "ibm": "IBM",
    "aws": "AWS",
    "sap": "SAP",
    "paypal": "PayPal",
    "ebay": "eBay",
    "tiktok": "TikTok",
    "tsmc": "TSMC",
    "ubs": "UBS",
    "t-mobile": "T-Mobile",
    "at&t": "AT&T",
    "exxonmobil": "ExxonMobil",
    "totalenergies": "TotalEnergies",
    "tusimple": "TuSimple",
    "tcs": "TCS",
    "tata consultancy services": "Tata Consultancy Services",
    "tata consultancy": "Tata Consultancy Services",
    "hcltech": "HCLTech",
    "hcl technologies": "HCLTech",
}


def _canonical_company_name(key: str) -> str:
    """Return a properly-branded company name for a geocoder key."""
    lk = key.lower()
    if lk in _BRAND_OVERRIDES:
        return _BRAND_OVERRIDES[lk]
    return key.title()


def _verify_row_exists(url: str, key: str, slug: str) -> bool:
    """Query pulse_case_studies by slug to confirm a row exists."""
    api = f"{url}/rest/v1/pulse_case_studies?slug=eq.{slug}&select=id"
    req = Request(
        api,
        headers={"Authorization": f"Bearer {key}", "apikey": key},
    )
    try:
        with urlopen(req, timeout=15) as resp:
            if resp.status != 200:
                return False
            rows = json.loads(resp.read().decode("utf-8"))
            return isinstance(rows, list) and len(rows) > 0
    except Exception:
        return False


def _log_pulse_failure(slug: str, reason: str, detail: str) -> None:
    """Append a structured failure record to pipeline/logs/pulse_failures.jsonl.

    The pipeline continues on pulse failures, but the log file + stdout
    combination ensures a human can spot recurring issues and fix them.
    """
    try:
        from datetime import datetime, timezone
        from pathlib import Path as _Path

        log_dir = _Path(__file__).resolve().parents[1] / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / "pulse_failures.jsonl"

        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "slug": slug,
            "reason": reason,
            "detail": detail,
        }
        with log_file.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        # Logging is best-effort — don't let a log failure crash the publish step
        pass


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
