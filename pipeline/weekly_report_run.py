#!/usr/bin/env python3
"""
Particle Post — Weekly Report
Runs every Friday at 8pm ET via GitHub Actions (cron: 0 0 * * 6 = Saturday 00:00 UTC).

Aggregates a full week of pipeline data from local files and sends an HTML email.
No LLM required — pure data aggregation.

Required env var:
  RESEND_API_KEY — from resend.com (free tier: 3,000 emails/month)
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
_CONFIG_DIR = _REPO_ROOT / "pipeline" / "config"
_LOGS_DIR   = _REPO_ROOT / "pipeline" / "logs"
_DATA_DIR   = _REPO_ROOT / "pipeline" / "data"

RECIPIENT  = "contact@theparticlepost.com"
FROM_EMAIL = "Particle Post Reports <reports@theparticlepost.com>"


# ──────────────────────────────────────────────────────────────────────────────
# Data collection
# ──────────────────────────────────────────────────────────────────────────────

def _week_range() -> tuple[str, str]:
    """Return ISO date strings for Monday–Sunday of the current week (UTC)."""
    today = datetime.now(timezone.utc)
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    return monday.strftime("%Y-%m-%d"), sunday.strftime("%Y-%m-%d")


def _is_this_week(date_str: str, week_start: str, week_end: str) -> bool:
    """Return True if date_str (YYYY-MM-DD or ISO datetime) falls within the week."""
    if not date_str:
        return False
    date_short = date_str[:10]
    return week_start <= date_short <= week_end


def collect_posts(week_start: str, week_end: str) -> dict:
    """Count published posts this week, with funnel breakdown."""
    result = {"total": 0, "morning": 0, "evening": 0,
              "TOF": 0, "MOF": 0, "BOF": 0, "unknown": 0, "titles": []}

    # Get posts from topics_history (has date)
    history_file = _REPO_ROOT / "blog" / "data" / "topics_history.json"
    weekly_slugs = set()
    if history_file.exists():
        try:
            history = json.loads(history_file.read_text(encoding="utf-8"))
            for p in history.get("posts", []):
                pub_date = p.get("published_at", p.get("date", ""))[:10]
                if _is_this_week(pub_date, week_start, week_end):
                    result["total"] += 1
                    weekly_slugs.add(p.get("slug", ""))
                    result["titles"].append(p.get("title", ""))
        except Exception:
            pass

    # Get funnel breakdown from post_index
    index_file = _CONFIG_DIR / "post_index.json"
    if index_file.exists():
        try:
            index = json.loads(index_file.read_text(encoding="utf-8"))
            for p in index.get("posts", []):
                if p.get("slug") in weekly_slugs:
                    ft = p.get("funnel_type", "unknown")
                    if ft in result:
                        result[ft] += 1
                    else:
                        result["unknown"] += 1
        except Exception:
            pass

    return result


def collect_rejections(week_start: str, week_end: str) -> dict:
    """Count and summarize Production Director rejections this week."""
    result = {"total": 0, "common_issues": [], "avg_score": 0}
    rejections_dir = _LOGS_DIR / "rejections"
    scores = []
    all_issues = []

    if rejections_dir.exists():
        for f in sorted(rejections_dir.glob("*.json")):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                ts = data.get("timestamp", f.stem)[:10]
                if _is_this_week(ts, week_start, week_end):
                    result["total"] += 1
                    verdict = data.get("verdict", {})
                    score = verdict.get("score", 0)
                    if score:
                        scores.append(score)
                    all_issues.extend(verdict.get("issues", []))
            except Exception:
                pass

    result["avg_score"] = round(sum(scores) / len(scores), 1) if scores else 0
    # Top 3 most common issue keywords
    issue_text = " ".join(all_issues).lower()
    common = []
    for keyword in ["word count", "lede", "source", "ai-tell", "internal link",
                    "funnel", "structure", "frontmatter", "image"]:
        if keyword in issue_text:
            common.append(keyword)
    result["common_issues"] = common[:4]
    return result


def collect_coaching_notes() -> list[str]:
    """Return the 3 most recent coaching notes from the Production Director."""
    feedback_file = _DATA_DIR / "writer_feedback.json"
    if not feedback_file.exists():
        return []
    try:
        data = json.loads(feedback_file.read_text(encoding="utf-8"))
        notes = data.get("notes", [])[-3:]
        return [n.get("text", "") for n in reversed(notes)]
    except Exception:
        return []


def collect_strategy(week_start: str, week_end: str) -> dict:
    """Collect marketing strategy decisions and content strategy changes this week."""
    result = {
        "marketing_decisions": [],
        "content_strategy_changes": [],
        "current_plan": "",
        "ui_changes": 0,
    }

    # Marketing strategy decisions this week
    strategy_file = _CONFIG_DIR / "marketing_strategy.json"
    if strategy_file.exists():
        try:
            data = json.loads(strategy_file.read_text(encoding="utf-8"))
            result["current_plan"] = data.get("current_plan", {}).get("description", "")
            for entry in data.get("decision_history", []):
                if _is_this_week(entry.get("date", ""), week_start, week_end):
                    result["marketing_decisions"].append({
                        "date":     entry.get("date", ""),
                        "decision": entry.get("decision", ""),
                        "rationale": entry.get("rationale", "")[:120],
                    })
        except Exception:
            pass

    # Content strategy changes this week
    content_strategy_file = _CONFIG_DIR / "content_strategy.json"
    if content_strategy_file.exists():
        try:
            data = json.loads(content_strategy_file.read_text(encoding="utf-8"))
            for change in data.get("change_log", []):
                if _is_this_week(change.get("date", ""), week_start, week_end):
                    result["content_strategy_changes"].append({
                        "field":   change.get("field_path", ""),
                        "from":    str(change.get("old_value", "")),
                        "to":      str(change.get("new_value", "")),
                        "why":     change.get("rationale", "")[:100],
                    })
        except Exception:
            pass

    # UI changes this week
    ui_history_file = _CONFIG_DIR / "ui_change_history.json"
    if ui_history_file.exists():
        try:
            data = json.loads(ui_history_file.read_text(encoding="utf-8"))
            for change in data.get("changes", []):
                if _is_this_week(change.get("date", ""), week_start, week_end):
                    result["ui_changes"] += len(change.get("changes_applied", []))
        except Exception:
            pass

    return result


def collect_daily_reports(week_start: str, week_end: str) -> list[str]:
    """Return list of daily marketing report dates generated this week."""
    reports_dir = _LOGS_DIR / "marketing"
    dates = []
    if reports_dir.exists():
        for f in sorted(reports_dir.glob("*.md")):
            date_str = f.stem[:10]
            if _is_this_week(date_str, week_start, week_end):
                dates.append(date_str)
    return dates


# ──────────────────────────────────────────────────────────────────────────────
# HTML report builder
# ──────────────────────────────────────────────────────────────────────────────

def build_html_report(
    week_start: str,
    week_end: str,
    posts: dict,
    rejections: dict,
    coaching: list[str],
    strategy: dict,
    report_dates: list[str],
) -> str:
    today = datetime.now(timezone.utc).strftime("%B %d, %Y")
    approval_rate = 0
    total_runs = posts["total"] + rejections["total"]
    if total_runs > 0:
        approval_rate = round((posts["total"] / total_runs) * 100)

    funnel_rows = ""
    for ftype, color in [("TOF", "#3B82F6"), ("MOF", "#8B5CF6"), ("BOF", "#10B981")]:
        count = posts.get(ftype, 0)
        funnel_rows += f"""
        <tr>
          <td style="padding:8px 12px;color:#374151;font-weight:600;">
            <span style="color:{color};">●</span> {ftype}
          </td>
          <td style="padding:8px 12px;color:#374151;text-align:center;">{count}</td>
        </tr>"""

    coaching_html = ""
    for note in coaching:
        coaching_html += f'<li style="margin:6px 0;color:#374151;">{note}</li>'
    if not coaching_html:
        coaching_html = '<li style="color:#9CA3AF;font-style:italic;">No coaching notes yet.</li>'

    strategy_decisions_html = ""
    for dec in strategy["marketing_decisions"]:
        badge_color = {"KEEP": "#10B981", "ADJUST": "#F59E0B", "NEW": "#3B82F6"}.get(dec["decision"], "#6B7280")
        strategy_decisions_html += f"""
        <div style="margin:8px 0;padding:10px 14px;background:#F9FAFB;border-radius:6px;border-left:3px solid {badge_color};">
          <span style="font-size:11px;font-weight:700;color:{badge_color};text-transform:uppercase;">{dec['decision']}</span>
          <span style="font-size:11px;color:#9CA3AF;margin-left:8px;">{dec['date']}</span>
          <p style="margin:4px 0 0;font-size:13px;color:#374151;">{dec['rationale']}</p>
        </div>"""
    if not strategy_decisions_html:
        strategy_decisions_html = '<p style="color:#9CA3AF;font-style:italic;font-size:13px;">No strategy decisions recorded this week.</p>'

    content_changes_html = ""
    for ch in strategy["content_strategy_changes"]:
        content_changes_html += f"""
        <div style="margin:6px 0;font-size:13px;color:#374151;">
          <code style="background:#F3F4F6;padding:2px 6px;border-radius:3px;font-size:11px;">{ch['field']}</code>
          <span style="color:#9CA3AF;margin:0 6px;">→</span>
          <strong>{ch['to']}</strong>
          <span style="color:#9CA3AF;font-size:12px;display:block;margin-top:2px;">{ch['why']}</span>
        </div>"""
    if not content_changes_html:
        content_changes_html = '<p style="color:#9CA3AF;font-style:italic;font-size:13px;">No content strategy changes this week.</p>'

    titles_html = ""
    for title in posts["titles"][:10]:
        titles_html += f'<li style="margin:4px 0;font-size:13px;color:#374151;">{title}</li>'
    if not titles_html:
        titles_html = '<li style="color:#9CA3AF;font-style:italic;">No posts published this week.</li>'

    daily_reports_html = ""
    if report_dates:
        daily_reports_html = "Daily marketing reports generated: " + ", ".join(report_dates)
    else:
        daily_reports_html = "No daily marketing reports this week."

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Particle Post — Weekly Report</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="background:#111827;border-radius:12px 12px 0 0;padding:32px 32px 24px;">
    <p style="margin:0;font-size:12px;color:#6B7280;letter-spacing:1px;text-transform:uppercase;">Particle Post</p>
    <h1 style="margin:8px 0 4px;font-size:24px;font-weight:700;color:#FFFFFF;">Weekly Report</h1>
    <p style="margin:0;font-size:14px;color:#9CA3AF;">Week of {week_start} → {week_end} &nbsp;·&nbsp; Generated {today}</p>
  </td></tr>

  <!-- Summary bar -->
  <tr><td style="background:#1F2937;padding:20px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="border-right:1px solid #374151;padding:0 16px 0 0;">
        <p style="margin:0;font-size:28px;font-weight:700;color:#FFFFFF;">{posts['total']}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;">Articles Published</p>
      </td>
      <td align="center" style="border-right:1px solid #374151;padding:0 16px;">
        <p style="margin:0;font-size:28px;font-weight:700;color:#FFFFFF;">{rejections['total']}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;">Rejections</p>
      </td>
      <td align="center" style="border-right:1px solid #374151;padding:0 16px;">
        <p style="margin:0;font-size:28px;font-weight:700;color:#{'10B981' if approval_rate >= 70 else 'F59E0B' if approval_rate >= 50 else 'EF4444'};">{approval_rate}%</p>
        <p style="margin:4px 0 0;font-size:11px;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;">Approval Rate</p>
      </td>
      <td align="center" style="padding:0 0 0 16px;">
        <p style="margin:0;font-size:28px;font-weight:700;color:#FFFFFF;">{strategy['ui_changes']}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;">UI Changes</p>
      </td>
    </tr>
    </table>
  </td></tr>

  <!-- Content -->
  <tr><td style="background:#FFFFFF;padding:28px 32px 0;">

    <!-- Funnel breakdown -->
    <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#111827;">Content Funnel Breakdown</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin-bottom:28px;">
      <tr style="background:#F9FAFB;">
        <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6B7280;font-weight:600;">Stage</th>
        <th style="padding:8px 12px;text-align:center;font-size:12px;color:#6B7280;font-weight:600;">Published</th>
      </tr>
      {funnel_rows}
      <tr style="background:#F9FAFB;border-top:1px solid #E5E7EB;">
        <td style="padding:8px 12px;color:#374151;font-weight:700;">Total</td>
        <td style="padding:8px 12px;color:#374151;font-weight:700;text-align:center;">{posts['total']}</td>
      </tr>
    </table>

    <!-- Published articles -->
    <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#111827;">Articles Published This Week</h2>
    <ul style="margin:0 0 28px;padding-left:20px;">
      {titles_html}
    </ul>

    <!-- Production quality -->
    <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#111827;">Production Quality</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td style="padding:6px 0;font-size:13px;color:#6B7280;width:180px;">Rejections this week</td>
        <td style="padding:6px 0;font-size:13px;color:#374151;font-weight:600;">{rejections['total']}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:13px;color:#6B7280;">Avg rejection score</td>
        <td style="padding:6px 0;font-size:13px;color:#374151;font-weight:600;">{rejections['avg_score']}/100</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:13px;color:#6B7280;vertical-align:top;">Common issues</td>
        <td style="padding:6px 0;font-size:13px;color:#374151;">{', '.join(rejections['common_issues']) if rejections['common_issues'] else 'None recorded'}</td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#374151;">Latest coaching notes from Production Director:</p>
    <ul style="margin:0 0 28px;padding-left:20px;">
      {coaching_html}
    </ul>

    <!-- Strategy -->
    <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#111827;">Strategy This Week</h2>

    <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#374151;">Current editorial plan:</p>
    <p style="margin:0 0 16px;font-size:13px;color:#6B7280;font-style:italic;">
      {strategy['current_plan'] or 'No plan description available.'}
    </p>

    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#374151;">Marketing Director decisions:</p>
    {strategy_decisions_html}

    <p style="margin:16px 0 8px;font-size:13px;font-weight:600;color:#374151;">Content strategy changes:</p>
    {content_changes_html}

    <!-- Daily reports -->
    <h2 style="margin:28px 0 8px;font-size:16px;font-weight:700;color:#111827;">Daily Marketing Reports</h2>
    <p style="margin:0 0 28px;font-size:13px;color:#6B7280;">{daily_reports_html}</p>

  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#F9FAFB;border-top:1px solid #E5E7EB;border-radius:0 0 12px 12px;padding:20px 32px;">
    <p style="margin:0;font-size:12px;color:#9CA3AF;">
      This report was generated automatically by the Particle Post pipeline every Friday at 8pm ET.
      &nbsp;·&nbsp;
      <a href="https://theparticlepost.com" style="color:#2563EB;text-decoration:none;">theparticlepost.com</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""


# ──────────────────────────────────────────────────────────────────────────────
# Email sending via Resend REST API
# ──────────────────────────────────────────────────────────────────────────────

def send_email(subject: str, html: str) -> None:
    """Send the report via Resend API using stdlib urllib (no extra dependencies)."""
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        print("[ERROR] RESEND_API_KEY environment variable not set.")
        sys.exit(1)
    print(f"  RESEND_API_KEY: prefix={api_key[:8]}... length={len(api_key)}")

    payload = json.dumps({
        "from":    FROM_EMAIL,
        "to":      [RECIPIENT],
        "subject": subject,
        "html":    html,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type":  "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8")
            print(f"  Email sent successfully. Response: {body}")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"[ERROR] Resend API returned {e.code}: {error_body}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Failed to send email: {e}")
        sys.exit(1)


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main() -> None:
    week_start, week_end = _week_range()
    today_str = datetime.now(timezone.utc).strftime("%B %d, %Y")

    print(f"\n{'='*60}")
    print(f"  PARTICLE POST — WEEKLY REPORT")
    print(f"  Week: {week_start} → {week_end}")
    print(f"{'='*60}\n")

    print("  Collecting posts...")
    posts = collect_posts(week_start, week_end)
    print(f"    {posts['total']} posts | TOF:{posts['TOF']} MOF:{posts['MOF']} BOF:{posts['BOF']}")

    print("  Collecting rejections...")
    rejections = collect_rejections(week_start, week_end)
    print(f"    {rejections['total']} rejections | avg score: {rejections['avg_score']}")

    print("  Collecting coaching notes...")
    coaching = collect_coaching_notes()

    print("  Collecting strategy data...")
    strategy = collect_strategy(week_start, week_end)
    print(f"    {len(strategy['marketing_decisions'])} decisions | "
          f"{len(strategy['content_strategy_changes'])} strategy changes | "
          f"{strategy['ui_changes']} UI changes")

    print("  Collecting daily reports...")
    report_dates = collect_daily_reports(week_start, week_end)

    print("  Building HTML report...")
    html = build_html_report(
        week_start=week_start,
        week_end=week_end,
        posts=posts,
        rejections=rejections,
        coaching=coaching,
        strategy=strategy,
        report_dates=report_dates,
    )

    subject = f"Particle Post Weekly Report — {week_start} to {week_end}"

    print(f"  Sending to {RECIPIENT}...")
    send_email(subject=subject, html=html)

    print(f"\n{'='*60}")
    print(f"  WEEKLY REPORT SENT")
    print(f"  To: {RECIPIENT}")
    print(f"  Subject: {subject}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
