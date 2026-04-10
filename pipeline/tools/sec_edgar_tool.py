"""
SEC EDGAR client for financial statement data.

Used by the research phase of the content pipeline to pull authoritative
multi-year financials for US public companies. Case studies and deep
dives about US-listed firms cite line items from this data instead of
vague references to press releases.

Stdlib only — no extra dependencies. SEC requires a User-Agent header
identifying the requester; we use the Particle Post domain.

Public API:
    resolve_ticker(company_name)  -> dict | None
    fetch_company_facts(cik)      -> dict
    extract_key_metrics(facts)    -> dict
    format_financial_brief(company, metrics) -> str

The tickers file is cached on disk under pipeline/data/sec_tickers.json
after the first successful fetch so we don't hit the network every run.
"""

from __future__ import annotations

import gzip
import io
import json
import time
import zlib
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_DATA_DIR = _PROJECT_ROOT / "pipeline" / "data"
_TICKERS_CACHE = _DATA_DIR / "sec_tickers.json"

_USER_AGENT = "Particle Post Research research@theparticlepost.com"
_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
_COMPANY_FACTS_URL = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"

# Minimum time between SEC requests in seconds. SEC rate limit is 10
# requests/sec; we stay well below.
_RATE_LIMIT_DELAY = 0.2
_last_request_time = 0.0


def _rate_limited_get(url: str) -> bytes:
    """GET with a basic throttle + required SEC User-Agent header.

    Handles gzip/deflate transparently since SEC always responds with
    Content-Encoding: gzip regardless of what we ask for.
    """
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < _RATE_LIMIT_DELAY:
        time.sleep(_RATE_LIMIT_DELAY - elapsed)

    req = Request(
        url,
        headers={
            "User-Agent": _USER_AGENT,
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
        },
    )
    with urlopen(req, timeout=30) as resp:
        body = resp.read()
        encoding = (resp.headers.get("Content-Encoding") or "").lower()
        _last_request_time = time.time()

    if "gzip" in encoding:
        body = gzip.GzipFile(fileobj=io.BytesIO(body)).read()
    elif "deflate" in encoding:
        body = zlib.decompress(body)
    return body


def _load_tickers() -> dict[str, dict[str, Any]]:
    """Return a dict keyed by lowercase company name → {ticker, cik, name}.

    Uses the local cache if present, else fetches and stores it.
    """
    if _TICKERS_CACHE.exists() and _TICKERS_CACHE.stat().st_size > 0:
        try:
            raw = json.loads(_TICKERS_CACHE.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                return raw
        except json.JSONDecodeError:
            pass

    # Fetch from SEC
    try:
        raw = _rate_limited_get(_TICKERS_URL)
    except (HTTPError, URLError) as e:
        print(f"  [SEC] Failed to fetch tickers: {e}")
        return {}

    # The SEC returns {"0": {"cik_str": 320193, "ticker": "AAPL", "title": "Apple Inc."}, ...}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {}

    indexed: dict[str, dict[str, Any]] = {}
    for item in data.values():
        name = str(item.get("title", "")).strip()
        ticker = str(item.get("ticker", "")).strip().upper()
        cik = str(item.get("cik_str", "")).zfill(10)
        if not name or not ticker or not cik:
            continue
        indexed[name.lower()] = {"name": name, "ticker": ticker, "cik": cik}

    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    _TICKERS_CACHE.write_text(json.dumps(indexed, indent=2), encoding="utf-8")
    return indexed


def resolve_ticker(company_name: str) -> dict[str, Any] | None:
    """Fuzzy-match a company name against SEC's ticker list.

    Returns {"name", "ticker", "cik"} or None.
    """
    name = (company_name or "").strip().lower()
    if not name:
        return None

    tickers = _load_tickers()
    if not tickers:
        return None

    # 1. Exact match
    if name in tickers:
        return tickers[name]

    # 2. "Walmart" → "walmart inc" etc.
    for key, value in tickers.items():
        if key.startswith(name + " ") or key == name + ".":
            return value

    # 3. First word of company in our query
    query_first = name.split()[0] if name.split() else ""
    if query_first and len(query_first) > 2:
        for key, value in tickers.items():
            if key.split()[0] if key.split() else "" == query_first:
                return value

    # 4. Contains match (last resort)
    for key, value in tickers.items():
        if name in key or key in name:
            return value

    return None


def fetch_company_facts(cik: str) -> dict[str, Any]:
    """Fetch the full company facts blob from SEC XBRL API.

    CIK must be zero-padded to 10 digits.
    Returns {} on failure.
    """
    cik_padded = cik.zfill(10)
    url = _COMPANY_FACTS_URL.format(cik=cik_padded)
    try:
        raw = _rate_limited_get(url)
        return json.loads(raw)
    except (HTTPError, URLError) as e:
        print(f"  [SEC] companyfacts fetch failed for CIK {cik}: {e}")
        return {}
    except json.JSONDecodeError:
        return {}


# XBRL concept → human-readable label. Multiple candidate concepts per
# metric because companies file under different variants.
_METRIC_CONCEPTS = {
    "revenue": ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "SalesRevenueNet"],
    "net_income": ["NetIncomeLoss", "ProfitLoss"],
    "operating_income": ["OperatingIncomeLoss"],
    "research_and_development": ["ResearchAndDevelopmentExpense"],
    "capital_expenditures": [
        "PaymentsToAcquirePropertyPlantAndEquipment",
        "PaymentsToAcquireProductiveAssets",
    ],
    "cash_and_equivalents": [
        "CashAndCashEquivalentsAtCarryingValue",
        "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
    ],
}


def extract_key_metrics(facts: dict[str, Any], years: int = 3) -> dict[str, list[dict]]:
    """Extract the last *years* annual (10-K) values for each key metric.

    Returns {metric_name: [{year, value, unit, filing_date}, ...]}
    Ordered most-recent first.
    """
    out: dict[str, list[dict]] = {}
    us_gaap = facts.get("facts", {}).get("us-gaap", {})
    if not us_gaap:
        return out

    for metric, candidates in _METRIC_CONCEPTS.items():
        for concept in candidates:
            item = us_gaap.get(concept)
            if not item:
                continue
            units = item.get("units", {})
            # Prefer USD, fall back to first available unit
            unit_key = "USD" if "USD" in units else (next(iter(units)) if units else None)
            if not unit_key:
                continue
            records = units[unit_key]
            # Keep only annual (10-K) filings, fp == "FY"
            annual = [
                r for r in records
                if r.get("form") == "10-K" and r.get("fp") == "FY" and r.get("fy")
            ]
            if not annual:
                continue
            # Dedupe by fiscal year, keep latest filing per year
            by_year: dict[int, dict] = {}
            for r in annual:
                fy = int(r.get("fy", 0))
                existing = by_year.get(fy)
                if not existing or r.get("filed", "") > existing.get("filed", ""):
                    by_year[fy] = r
            sorted_years = sorted(by_year.keys(), reverse=True)[:years]
            out[metric] = [
                {
                    "year": fy,
                    "value": by_year[fy].get("val"),
                    "unit": unit_key,
                    "filing_date": by_year[fy].get("filed"),
                    "end_date": by_year[fy].get("end"),
                    "concept": concept,
                }
                for fy in sorted_years
            ]
            break  # first matching concept wins
    return out


def _fmt_usd(value: Any) -> str:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return "n/a"
    abs_n = abs(n)
    sign = "-" if n < 0 else ""
    if abs_n >= 1e12:
        return f"{sign}${abs_n / 1e12:.2f}T"
    if abs_n >= 1e9:
        return f"{sign}${abs_n / 1e9:.2f}B"
    if abs_n >= 1e6:
        return f"{sign}${abs_n / 1e6:.1f}M"
    return f"{sign}${abs_n:,.0f}"


def format_financial_brief(company: str, metrics: dict[str, list[dict]]) -> str:
    """Return a markdown block summarizing the last 3 years of financials.

    Intended to be appended to the research briefing before the writer
    sees it. Cites specific line items with fiscal year and filing date.
    """
    if not metrics:
        return f"### Financial data for {company}\n\nNo SEC filings found.\n"

    lines = [
        f"### Financial data for {company} (SEC EDGAR 10-K)",
        "",
        "All figures sourced directly from XBRL filings on SEC EDGAR. Every",
        "cited number must be attributed with fiscal year and filing date.",
        "",
    ]

    for metric_name, records in metrics.items():
        if not records:
            continue
        label = metric_name.replace("_", " ").title()
        lines.append(f"**{label}:**")
        for r in records:
            fy = r.get("year")
            val = _fmt_usd(r.get("value"))
            filed = r.get("filing_date", "")
            end = r.get("end_date", "")
            concept = r.get("concept", "")
            lines.append(
                f"- FY{fy}: {val} "
                f"(XBRL: `{concept}`, period end {end}, 10-K filed {filed})"
            )
        lines.append("")

    # Compute simple YoY deltas where possible
    lines.append("**Derived ratios:**")
    rev = metrics.get("revenue", [])
    ni = metrics.get("net_income", [])
    oi = metrics.get("operating_income", [])
    if len(rev) >= 2 and rev[0].get("value") and rev[1].get("value"):
        try:
            growth = (float(rev[0]["value"]) - float(rev[1]["value"])) / float(rev[1]["value"]) * 100
            lines.append(f"- Revenue YoY growth (FY{rev[0]['year']}): {growth:+.1f}%")
        except (TypeError, ValueError, ZeroDivisionError):
            pass
    if rev and oi and rev[0].get("value") and oi[0].get("value"):
        try:
            margin = float(oi[0]["value"]) / float(rev[0]["value"]) * 100
            lines.append(f"- Operating margin (FY{oi[0]['year']}): {margin:.1f}%")
        except (TypeError, ValueError, ZeroDivisionError):
            pass
    if rev and ni and rev[0].get("value") and ni[0].get("value"):
        try:
            margin = float(ni[0]["value"]) / float(rev[0]["value"]) * 100
            lines.append(f"- Net margin (FY{ni[0]['year']}): {margin:.1f}%")
        except (TypeError, ValueError, ZeroDivisionError):
            pass

    return "\n".join(lines) + "\n"


def company_financial_brief(company_name: str) -> tuple[bool, str]:
    """Top-level convenience wrapper. Returns (found, markdown_brief).

    Used by the research task — drop this in front of any case_study /
    deep_dive research to get authoritative financials if available.
    """
    resolved = resolve_ticker(company_name)
    if not resolved:
        return (False, f"No SEC filings found for '{company_name}'.")
    facts = fetch_company_facts(resolved["cik"])
    if not facts:
        return (False, f"SEC companyfacts unavailable for {resolved['name']}.")
    metrics = extract_key_metrics(facts, years=3)
    if not metrics:
        return (False, f"No standard financial metrics found for {resolved['name']}.")
    brief = format_financial_brief(resolved["name"], metrics)
    return (True, brief)
