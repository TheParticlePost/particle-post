#!/usr/bin/env python3
"""
Particle Post -- Security Weekly Report

Runs every Friday at 9pm ET via GitHub Actions.
Aggregates all daily security scan logs from the week, computes trends,
generates fix prompts, and sends an HTML email report.

No LLM required -- pure data aggregation.

Required env var:
  RESEND_API_KEY -- from resend.com
"""

import json
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
import urllib.request
import urllib.error

# Fix Windows console encoding
if sys.platform == "win32":
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

_REPO_ROOT  = Path(__file__).resolve().parent.parent
_LOGS_DIR   = _REPO_ROOT / "pipeline" / "logs" / "security"
_CONFIG_DIR = _REPO_ROOT / "pipeline" / "config"
_SEC_CONFIG = _CONFIG_DIR / "security_config.json"

RECIPIENT  = "contact@theparticlepost.com"
FROM_EMAIL = "Particle Post Security <reports@theparticlepost.com>"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _week_range() -> tuple[str, str]:
    """Return ISO date strings for Monday-Sunday of the current week (UTC)."""
    today = datetime.now(timezone.utc)
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    return monday.strftime("%Y-%m-%d"), sunday.strftime("%Y-%m-%d")


def _prev_week_range() -> tuple[str, str]:
    """Return ISO date strings for Monday-Sunday of last week."""
    today = datetime.now(timezone.utc)
    last_monday = today - timedelta(days=today.weekday() + 7)
    last_sunday = last_monday + timedelta(days=6)
    return last_monday.strftime("%Y-%m-%d"), last_sunday.strftime("%Y-%m-%d")


def _in_range(date_str: str, start: str, end: str) -> bool:
    """Check if date_str falls within [start, end]."""
    return start <= date_str[:10] <= end


# ---------------------------------------------------------------------------
# Data collection
# ---------------------------------------------------------------------------
def collect_findings(week_start: str, week_end: str) -> dict:
    """Read all security logs for the given week range."""
    result = {
        "critical": 0, "high": 0, "medium": 0, "low": 0,
        "auto_fixed": 0, "scans": 0,
        "findings": [],  # Deduped by (category, title)
        "raw_findings": [],
    }
    seen = set()

    if not _LOGS_DIR.exists():
        return result

    for log_file in sorted(_LOGS_DIR.glob("*.json")):
        date_str = log_file.stem  # YYYY-MM-DD
        if not _in_range(date_str, week_start, week_end):
            continue

        try:
            data = json.loads(log_file.read_text(encoding="utf-8"))
        except Exception:
            continue

        result["scans"] += 1
        summary = data.get("summary", {})
        result["auto_fixed"] += summary.get("auto_fixed", 0)

        for f in data.get("findings", []):
            result["raw_findings"].append(f)
            key = (f.get("category", ""), f.get("title", ""))
            sev = f.get("severity", "LOW").lower()
            if sev in result:
                result[sev] += 1

            if key not in seen:
                seen.add(key)
                f["first_seen"] = date_str
                f["last_seen"] = date_str
                result["findings"].append(f)
            else:
                # Update last_seen for existing finding
                for existing in result["findings"]:
                    if (existing.get("category"), existing.get("title")) == key:
                        existing["last_seen"] = date_str
                        break

    return result


def collect_key_rotation() -> list[dict]:
    """Get key rotation status from config."""
    if not _SEC_CONFIG.exists():
        return []

    config = json.loads(_SEC_CONFIG.read_text(encoding="utf-8"))
    rotation_dates = config.get("key_rotation_dates", {})
    thresholds = config.get("rotation_thresholds", {})
    warn_days = thresholds.get("warn_days", 90)
    crit_days = thresholds.get("critical_days", 180)
    today = datetime.now(timezone.utc).date()

    keys = []
    for name, date_str in rotation_dates.items():
        try:
            last_rotated = datetime.strptime(date_str, "%Y-%m-%d").date()
            age = (today - last_rotated).days
        except Exception:
            age = -1

        if age > crit_days:
            status = "critical"
        elif age > warn_days:
            status = "warning"
        else:
            status = "ok"

        keys.append({"name": name, "last_rotated": date_str, "age_days": age, "status": status})

    return sorted(keys, key=lambda k: -k["age_days"])


# ---------------------------------------------------------------------------
# HTML Report Builder
# ---------------------------------------------------------------------------
def build_html_report(
    week_start: str, week_end: str,
    current: dict, previous: dict,
    key_rotation: list[dict],
) -> str:
    """Build the full HTML security report."""
    today_str = datetime.now(timezone.utc).strftime("%B %d, %Y")

    def trend_arrow(curr: int, prev: int) -> str:
        if curr > prev:
            return f'<span style="color:#ef4444">&#9650; +{curr - prev}</span>'
        elif curr < prev:
            return f'<span style="color:#10b981">&#9660; {curr - prev}</span>'
        return '<span style="color:#6b7280">&#8213; 0</span>'

    def sev_color(sev: str) -> str:
        return {"critical": "#dc2626", "high": "#f97316", "medium": "#eab308", "low": "#6b7280"}.get(sev, "#6b7280")

    # Summary cards
    cards = ""
    for sev in ["critical", "high", "medium", "low"]:
        count = current.get(sev, 0)
        prev_count = previous.get(sev, 0)
        color = sev_color(sev)
        bg = "#fef2f2" if sev == "critical" and count > 0 else "#f8fafc"
        cards += f"""
        <td style="background:{bg};padding:16px;border-radius:8px;text-align:center;width:25%">
            <div style="font-size:28px;font-weight:800;color:{color}">{count}</div>
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;letter-spacing:0.05em">{sev}</div>
            <div style="font-size:12px;margin-top:4px">{trend_arrow(count, prev_count)}</div>
        </td>"""

    # Findings table
    findings_rows = ""
    for f in sorted(current.get("findings", []), key=lambda x: ["CRITICAL", "HIGH", "MEDIUM", "LOW"].index(x.get("severity", "LOW"))):
        sev = f.get("severity", "LOW")
        color = sev_color(sev.lower())
        findings_rows += f"""<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb"><span style="color:{color};font-weight:700">{sev}</span></td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">{f.get('category', '')}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">{f.get('title', '')}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:11px">{f.get('file_path', '')}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:11px">{f.get('first_seen', '')}</td>
        </tr>"""

    # Fix prompts
    fix_prompts_html = ""
    unfixed = [f for f in current.get("findings", []) if not f.get("fixed") and f.get("fix_prompt")]
    for f in unfixed:
        sev = f.get("severity", "LOW")
        color = sev_color(sev.lower())
        fix_prompts_html += f"""
        <div style="margin-bottom:16px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
            <div style="background:#f8fafc;padding:10px 16px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between">
                <span style="font-weight:600;font-size:13px;color:#374151">{f.get('title', '')}</span>
                <span style="color:{color};font-weight:700;font-size:12px">{sev}</span>
            </div>
            <pre style="margin:0;padding:12px 16px;font-size:12px;line-height:1.5;background:#fff;white-space:pre-wrap;word-break:break-word;color:#374151">{f.get('fix_prompt', '')}</pre>
        </div>"""

    if not fix_prompts_html:
        fix_prompts_html = '<p style="color:#6b7280;font-size:14px;text-align:center;padding:16px">No open fix prompts this week.</p>'

    # Key rotation table
    key_rows = ""
    for k in key_rotation:
        status_color = {"ok": "#10b981", "warning": "#eab308", "critical": "#ef4444"}.get(k["status"], "#6b7280")
        status_label = {"ok": "OK", "warning": "ROTATE SOON", "critical": "OVERDUE"}.get(k["status"], "?")
        key_rows += f"""<tr>
            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px">{k['name']}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-size:12px">{k['last_rotated']}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-size:12px">{k['age_days']}d</td>
            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb"><span style="color:{status_color};font-weight:700;font-size:12px">{status_label}</span></td>
        </tr>"""

    # Auto-fix log
    auto_fixed_count = current.get("auto_fixed", 0)
    auto_fix_section = f'<p style="color:#10b981;font-weight:600;font-size:14px">{auto_fixed_count} issue(s) were auto-fixed this week.</p>' if auto_fixed_count else '<p style="color:#6b7280;font-size:14px">No auto-fixes applied this week.</p>'

    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;margin:0 auto">

<!-- Header -->
<tr><td style="background:#111827;padding:28px 32px;border-radius:12px 12px 0 0">
<h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">Security Report</h1>
<p style="color:#9ca3af;margin:6px 0 0;font-size:13px">Particle Post -- Week of {week_start} to {week_end}</p>
<p style="color:#6b7280;margin:4px 0 0;font-size:12px">Generated {today_str} | {current.get('scans', 0)} scans this week</p>
</td></tr>

<!-- Summary Cards -->
<tr><td style="background:#fff;padding:24px 32px">
<h2 style="margin:0 0 16px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280">Severity Overview</h2>
<table width="100%" cellpadding="0" cellspacing="8"><tr>{cards}</tr></table>
</td></tr>

<!-- Findings Table -->
<tr><td style="background:#fff;padding:0 32px 24px">
<h2 style="margin:0 0 12px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280">Findings ({len(current.get('findings', []))} unique)</h2>
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse">
<tr style="background:#f1f5f9">
<th style="padding:8px 12px;text-align:left;font-weight:600">Severity</th>
<th style="padding:8px 12px;text-align:left;font-weight:600">Category</th>
<th style="padding:8px 12px;text-align:left;font-weight:600">Finding</th>
<th style="padding:8px 12px;text-align:left;font-weight:600">File</th>
<th style="padding:8px 12px;text-align:left;font-weight:600">First Seen</th>
</tr>
{findings_rows if findings_rows else '<tr><td colspan="5" style="padding:16px;text-align:center;color:#6b7280">No findings this week.</td></tr>'}
</table>
</td></tr>

<!-- Auto-Fix Log -->
<tr><td style="background:#f8fafc;padding:16px 32px">
<h2 style="margin:0 0 8px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280">Auto-Fix Log</h2>
{auto_fix_section}
</td></tr>

<!-- Fix Prompts -->
<tr><td style="background:#fff;padding:24px 32px">
<h2 style="margin:0 0 12px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280">Fix Prompts (copy into Claude Code)</h2>
<p style="color:#6b7280;font-size:12px;margin:0 0 16px">Each prompt below can be pasted directly into Claude Code to fix the issue.</p>
{fix_prompts_html}
</td></tr>

<!-- Key Rotation Status -->
<tr><td style="background:#f8fafc;padding:24px 32px">
<h2 style="margin:0 0 12px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280">API Key Rotation Status</h2>
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse">
<tr style="background:#e5e7eb">
<th style="padding:6px 12px;text-align:left;font-weight:600">Key</th>
<th style="padding:6px 12px;text-align:left;font-weight:600">Last Rotated</th>
<th style="padding:6px 12px;text-align:left;font-weight:600">Age</th>
<th style="padding:6px 12px;text-align:left;font-weight:600">Status</th>
</tr>
{key_rows}
</table>
</td></tr>

<!-- Footer -->
<tr><td style="background:#111827;padding:16px 32px;border-radius:0 0 12px 12px;text-align:center">
<p style="color:#6b7280;font-size:12px;margin:0">Particle Post Security Agent -- automated weekly report</p>
</td></tr>

</table></body></html>"""

    return html


# ---------------------------------------------------------------------------
# Email sending
# ---------------------------------------------------------------------------
def send_email(subject: str, html: str) -> None:
    """Send report via Resend API."""
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        print("[ERROR] RESEND_API_KEY environment variable not set.")
        sys.exit(1)

    payload = json.dumps({
        "from": FROM_EMAIL,
        "to": [RECIPIENT],
        "subject": subject,
        "html": html,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "resend-python/2.0.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8")
            print(f"  Email sent successfully. Response: {body}")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"[ERROR] Resend API returned {e.code}: {error_body[:500]}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Failed to send email: {e}")
        sys.exit(1)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    week_start, week_end = _week_range()
    prev_start, prev_end = _prev_week_range()
    today_str = datetime.now(timezone.utc).strftime("%B %d, %Y")

    print(f"\n{'='*60}")
    print(f"  PARTICLE POST -- SECURITY WEEKLY REPORT")
    print(f"  Week: {week_start} to {week_end}")
    print(f"{'='*60}\n")

    print("  Collecting this week's findings...")
    current = collect_findings(week_start, week_end)
    print(f"    {current['scans']} scans | C:{current['critical']} H:{current['high']} "
          f"M:{current['medium']} L:{current['low']} | Auto-fixed: {current['auto_fixed']}")

    print("  Collecting last week's findings...")
    previous = collect_findings(prev_start, prev_end)

    print("  Collecting key rotation status...")
    key_rotation = collect_key_rotation()

    print("  Building HTML report...")
    html = build_html_report(week_start, week_end, current, previous, key_rotation)

    subject = (
        f"Security Report -- {week_start} to {week_end} | "
        f"C:{current['critical']} H:{current['high']} M:{current['medium']} L:{current['low']}"
    )

    print("  Sending email...")
    send_email(subject, html)

    print(f"\n  Report sent to {RECIPIENT}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
