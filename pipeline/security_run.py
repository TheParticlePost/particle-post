#!/usr/bin/env python3
"""
Particle Post -- Security Agent (Daily Scanner)

Runs every day at midnight ET via GitHub Actions.
Scans the entire codebase for vulnerabilities, exposed secrets, broken content,
and configuration drift. Ranks findings by severity and auto-fixes critical issues.

No LLM required -- pure Python with subprocess calls to pip-audit and bandit.

Required env vars:
  RESEND_API_KEY -- for critical alert emails
  GH_PAT         -- for triggering fix workflows (optional)
  PEXELS_API_KEY -- for auto-fixing broken cover images (optional)
"""

import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
import yaml
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

from dotenv import load_dotenv

# Fix Windows console encoding
if sys.platform == "win32":
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_REPO_ROOT     = Path(__file__).resolve().parent.parent
_PIPELINE_DIR  = _REPO_ROOT / "pipeline"
_CONFIG_DIR    = _PIPELINE_DIR / "config"
_LOGS_DIR      = _PIPELINE_DIR / "logs" / "security"
_POSTS_DIR     = _REPO_ROOT / "blog" / "content" / "posts"
_WORKFLOWS_DIR = _REPO_ROOT / ".github" / "workflows"
_SEC_CONFIG    = _CONFIG_DIR / "security_config.json"

RECIPIENT  = "contact@theparticlepost.com"
FROM_EMAIL = "Particle Post Security <reports@theparticlepost.com>"
GITHUB_REPO = "TheParticlePost/particle-post"


# ---------------------------------------------------------------------------
# Finding dataclass
# ---------------------------------------------------------------------------
@dataclass
class Finding:
    severity: str           # CRITICAL, HIGH, MEDIUM, LOW
    category: str           # dependency, code, secret, workflow, config, content, key_rotation
    title: str
    detail: str
    file_path: str = ""
    line_number: int = 0
    auto_fixable: bool = False
    fix_prompt: str = ""
    fixed: bool = False


def _load_config() -> dict:
    """Load security_config.json."""
    if _SEC_CONFIG.exists():
        return json.loads(_SEC_CONFIG.read_text(encoding="utf-8"))
    return {}


def _save_config(config: dict) -> None:
    """Write security_config.json."""
    _SEC_CONFIG.write_text(
        json.dumps(config, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


# ---------------------------------------------------------------------------
# Scanner 1: Dependency vulnerabilities (pip-audit)
# ---------------------------------------------------------------------------
def scan_dependencies() -> list[Finding]:
    """Run pip-audit on requirements.txt, map CVSS scores to severity."""
    findings: list[Finding] = []
    req_file = _REPO_ROOT / "requirements.txt"
    if not req_file.exists():
        return findings

    try:
        result = subprocess.run(
            ["pip-audit", "--format=json", f"--requirement={req_file}"],
            capture_output=True, text=True, timeout=120
        )
        # pip-audit returns exit code 1 when vulnerabilities found
        output = result.stdout.strip()
        if not output:
            return findings
        data = json.loads(output)
    except FileNotFoundError:
        print("  [WARN] pip-audit not installed, skipping dependency scan")
        return findings
    except (subprocess.TimeoutExpired, json.JSONDecodeError, Exception) as e:
        print(f"  [WARN] pip-audit failed: {e}")
        return findings

    config = _load_config()
    cvss_crit = config.get("severity_rules", {}).get("dependency_cvss_critical", 9.0)
    cvss_high = config.get("severity_rules", {}).get("dependency_cvss_high", 7.0)
    cvss_med  = config.get("severity_rules", {}).get("dependency_cvss_medium", 4.0)

    deps = data if isinstance(data, list) else data.get("dependencies", [])
    for dep in deps:
        vulns = dep.get("vulns", [])
        for vuln in vulns:
            vuln_id = vuln.get("id", "UNKNOWN")
            desc = vuln.get("description", "No description")
            fix_ver = vuln.get("fix_versions", [])
            fix_str = ", ".join(fix_ver) if fix_ver else "no fix available"

            # Determine severity from aliases or default to HIGH
            severity = "HIGH"
            for alias in vuln.get("aliases", []):
                if alias.startswith("CVE-"):
                    # If we had CVSS scores, we'd use them. pip-audit doesn't always
                    # provide them, so we default based on fix availability.
                    severity = "HIGH" if fix_ver else "CRITICAL"
                    break

            pkg_name = dep.get("name", "unknown")
            pkg_ver = dep.get("version", "?")
            findings.append(Finding(
                severity=severity,
                category="dependency",
                title=f"{pkg_name} {pkg_ver} has vulnerability {vuln_id}",
                detail=f"{desc[:300]}. Fix available: {fix_str}",
                file_path="requirements.txt",
                auto_fixable=False,
                fix_prompt=(
                    f"Update {pkg_name} from {pkg_ver} to {fix_str} in requirements.txt "
                    f"to fix {vuln_id}. Then run: pip install -r requirements.txt && "
                    f"python -m pipeline.run --slot morning --dry-run"
                ),
            ))

    return findings


# ---------------------------------------------------------------------------
# Scanner 2: Static code analysis (bandit)
# ---------------------------------------------------------------------------
def scan_code_security() -> list[Finding]:
    """Run bandit on pipeline/ directory."""
    findings: list[Finding] = []

    try:
        result = subprocess.run(
            ["bandit", "-r", str(_PIPELINE_DIR), "-f", "json",
             "--confidence-level", "HIGH", "-q"],
            capture_output=True, text=True, timeout=120
        )
        output = result.stdout.strip()
        if not output:
            return findings
        data = json.loads(output)
    except FileNotFoundError:
        print("  [WARN] bandit not installed, skipping code security scan")
        return findings
    except (subprocess.TimeoutExpired, json.JSONDecodeError, Exception) as e:
        print(f"  [WARN] bandit failed: {e}")
        return findings

    for issue in data.get("results", []):
        bsev = issue.get("issue_severity", "LOW").upper()
        bconf = issue.get("issue_confidence", "LOW").upper()

        # Map to our severity
        if bsev == "HIGH" and bconf == "HIGH":
            severity = "CRITICAL"
        elif bsev == "HIGH":
            severity = "HIGH"
        elif bsev == "MEDIUM":
            severity = "MEDIUM"
        else:
            severity = "LOW"

        fpath = issue.get("filename", "")
        # Make path relative
        try:
            fpath = str(Path(fpath).relative_to(_REPO_ROOT))
        except ValueError:
            pass

        findings.append(Finding(
            severity=severity,
            category="code",
            title=f"{issue.get('test_id', '?')}: {issue.get('issue_text', 'Unknown issue')}",
            detail=f"Line {issue.get('line_number', '?')}: {issue.get('issue_text', '')} "
                   f"(CWE: {issue.get('issue_cwe', {}).get('id', 'N/A')})",
            file_path=fpath,
            line_number=issue.get("line_number", 0),
            auto_fixable=False,
            fix_prompt=(
                f"In {fpath} line {issue.get('line_number', '?')}, fix bandit finding "
                f"{issue.get('test_id', '?')}: {issue.get('issue_text', '')}. "
                f"See: {issue.get('more_info', '')}"
            ),
        ))

    return findings


# ---------------------------------------------------------------------------
# Scanner 3: Secret detection
# ---------------------------------------------------------------------------
def scan_secrets() -> list[Finding]:
    """Scan all tracked files for hardcoded API keys and tokens."""
    findings: list[Finding] = []
    config = _load_config()
    patterns = config.get("scan_settings", {}).get("secret_patterns", [])
    excluded = config.get("scan_settings", {}).get("excluded_paths", [])

    if not patterns:
        return findings

    compiled = [re.compile(p) for p in patterns]

    # Get list of tracked files via git
    try:
        result = subprocess.run(
            ["git", "ls-files"], capture_output=True, text=True,
            cwd=str(_REPO_ROOT), timeout=15
        )
        tracked_files = result.stdout.strip().split("\n")
    except Exception:
        # Fallback: scan common extensions manually
        tracked_files = []
        for ext in ("*.py", "*.yml", "*.yaml", "*.json", "*.js", "*.toml", "*.md"):
            tracked_files.extend(
                str(p.relative_to(_REPO_ROOT)) for p in _REPO_ROOT.rglob(ext)
            )

    for fpath in tracked_files:
        if not fpath:
            continue
        # Skip excluded paths
        if any(fpath.startswith(ex) or f"/{ex}" in fpath for ex in excluded):
            continue
        # Only scan text-like files
        if not any(fpath.endswith(ext) for ext in
                    (".py", ".yml", ".yaml", ".json", ".js", ".toml", ".md", ".txt", ".cfg", ".ini")):
            continue

        full_path = _REPO_ROOT / fpath
        if not full_path.exists() or full_path.stat().st_size > 500_000:
            continue

        try:
            content = full_path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        for line_num, line in enumerate(content.split("\n"), 1):
            for pat in compiled:
                match = pat.search(line)
                if match:
                    # Skip obvious placeholders
                    val = match.group(0)
                    if any(fake in val.lower() for fake in
                           ["your-", "example", "placeholder", "xxx", "000000", "changeme",
                            "redacted", "test_key", "dummy"]):
                        continue

                    findings.append(Finding(
                        severity="CRITICAL",
                        category="secret",
                        title=f"Potential hardcoded secret in {fpath}",
                        detail=f"Line {line_num}: Pattern matched '{pat.pattern[:40]}...' "
                               f"Value preview: {val[:20]}...",
                        file_path=fpath,
                        line_number=line_num,
                        auto_fixable=True,
                        fix_prompt=(
                            f"CRITICAL: Hardcoded secret found in {fpath} line {line_num}. "
                            f"Replace the value with an environment variable reference "
                            f"(os.environ['KEY_NAME']) and ensure the actual value is only "
                            f"in .env (which is gitignored)."
                        ),
                    ))

    return findings


# ---------------------------------------------------------------------------
# Scanner 4: GitHub Actions workflow audit
# ---------------------------------------------------------------------------
def scan_workflows() -> list[Finding]:
    """Audit workflow files for security issues."""
    findings: list[Finding] = []
    if not _WORKFLOWS_DIR.exists():
        return findings

    for wf_path in _WORKFLOWS_DIR.glob("*.yml"):
        try:
            content = wf_path.read_text(encoding="utf-8")
            data = yaml.safe_load(content)
        except Exception:
            continue

        fname = str(wf_path.relative_to(_REPO_ROOT))

        # Check permissions
        perms = data.get("permissions", {})
        if isinstance(perms, str) and perms == "write-all":
            findings.append(Finding(
                severity="HIGH",
                category="workflow",
                title=f"Overly broad permissions in {wf_path.name}",
                detail="permissions: write-all grants full write access. Use minimal permissions.",
                file_path=fname,
                fix_prompt=f"In {fname}, replace 'permissions: write-all' with specific permissions (e.g., contents: write).",
            ))

        # Check for unpinned actions
        jobs = data.get("jobs", {})
        for job_name, job in (jobs or {}).items():
            steps = job.get("steps", [])
            for i, step in enumerate(steps or []):
                uses = step.get("uses", "")
                if uses and "@" in uses:
                    tag = uses.split("@")[1]
                    # Check if pinned to SHA (40 hex chars) or semver
                    if not re.match(r"^[0-9a-f]{40}$", tag) and not tag.startswith("v"):
                        findings.append(Finding(
                            severity="MEDIUM",
                            category="workflow",
                            title=f"Unpinned action in {wf_path.name}",
                            detail=f"Step {i+1} uses '{uses}' -- pin to a specific SHA or version tag.",
                            file_path=fname,
                            fix_prompt=f"In {fname}, pin action '{uses}' to a specific SHA hash for supply chain security.",
                        ))
                    elif tag.startswith("v") and "." not in tag:
                        # Major-only pin like @v4 (acceptable but note it)
                        pass

            # Check for missing timeout
            if "timeout-minutes" not in job:
                findings.append(Finding(
                    severity="LOW",
                    category="workflow",
                    title=f"Missing timeout-minutes in {wf_path.name} job '{job_name}'",
                    detail="Without a timeout, a hung workflow can consume Actions minutes indefinitely.",
                    file_path=fname,
                    fix_prompt=f"In {fname}, add 'timeout-minutes: 30' to job '{job_name}'.",
                ))

        # Check for secrets exposed in run commands (common mistake: echo $SECRET)
        for line_num, line in enumerate(content.split("\n"), 1):
            if re.search(r"echo\s+.*\$\{\{\s*secrets\.", line):
                findings.append(Finding(
                    severity="MEDIUM",
                    category="workflow",
                    title=f"Secret potentially echoed in {wf_path.name}",
                    detail=f"Line {line_num}: A secret may be printed to logs via echo.",
                    file_path=fname,
                    line_number=line_num,
                    fix_prompt=f"In {fname} line {line_num}, remove the echo statement that exposes a secret value.",
                ))

    return findings


# ---------------------------------------------------------------------------
# Scanner 5: Configuration drift
# ---------------------------------------------------------------------------
def scan_config_drift() -> list[Finding]:
    """Check .gitignore covers sensitive files and patterns."""
    findings: list[Finding] = []
    gitignore = _REPO_ROOT / ".gitignore"

    if not gitignore.exists():
        findings.append(Finding(
            severity="CRITICAL",
            category="config",
            title="No .gitignore file found",
            detail="Without .gitignore, sensitive files like .env could be committed.",
            file_path=".gitignore",
            auto_fixable=False,
            fix_prompt="Create a .gitignore file with at minimum: .env, *.pem, *.key, credentials.json",
        ))
        return findings

    content = gitignore.read_text(encoding="utf-8").lower()
    required_patterns = {
        ".env": "Environment variables with API keys",
        "*.pem": "SSL/TLS private keys",
        "*.key": "Private key files",
        "credentials.json": "Google Cloud credentials",
    }

    for pattern, desc in required_patterns.items():
        if pattern.lower() not in content:
            severity = "CRITICAL" if pattern == ".env" else "HIGH"
            findings.append(Finding(
                severity=severity,
                category="config",
                title=f"'{pattern}' not in .gitignore",
                detail=f"{desc} could be accidentally committed.",
                file_path=".gitignore",
                auto_fixable=False,
                fix_prompt=f"Add '{pattern}' to .gitignore to prevent accidental commit of {desc.lower()}.",
            ))

    # Check if .env actually exists and is tracked
    try:
        result = subprocess.run(
            ["git", "ls-files", "--error-unmatch", ".env"],
            capture_output=True, text=True, cwd=str(_REPO_ROOT), timeout=5
        )
        if result.returncode == 0:
            findings.append(Finding(
                severity="CRITICAL",
                category="config",
                title=".env is tracked by git despite .gitignore",
                detail="The .env file with API keys is in the git index. It must be removed from tracking.",
                file_path=".env",
                auto_fixable=False,
                fix_prompt="Run: git rm --cached .env && git commit -m 'Remove .env from tracking'",
            ))
    except Exception:
        pass

    return findings


# ---------------------------------------------------------------------------
# Scanner 6: Content integrity (images + links + injection)
# ---------------------------------------------------------------------------
def scan_content_integrity() -> list[Finding]:
    """Check cover images, internal links, and content injection in published articles."""
    findings: list[Finding] = []
    config = _load_config()
    timeout = config.get("scan_settings", {}).get("content_url_timeout_seconds", 5)
    max_articles = config.get("scan_settings", {}).get("max_articles_to_scan", 30)

    if not _POSTS_DIR.exists():
        return findings

    md_files = sorted(_POSTS_DIR.glob("*.md"), reverse=True)[:max_articles]

    for md_path in md_files:
        try:
            content = md_path.read_text(encoding="utf-8")
        except Exception:
            continue

        fname = str(md_path.relative_to(_REPO_ROOT))

        # Parse frontmatter
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                try:
                    fm = yaml.safe_load(parts[1]) or {}
                except Exception:
                    fm = {}
                body = parts[2]
            else:
                fm, body = {}, content
        else:
            fm, body = {}, content

        # Check cover image URL
        cover = fm.get("cover", {})
        img_url = cover.get("image", "") if isinstance(cover, dict) else ""
        if img_url and img_url.startswith("http"):
            try:
                req = urllib.request.Request(img_url, method="HEAD")
                req.add_header("User-Agent", "ParticlePost-SecurityBot/1.0")
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    if resp.status != 200:
                        raise Exception(f"HTTP {resp.status}")
            except Exception as e:
                findings.append(Finding(
                    severity="HIGH",
                    category="content",
                    title=f"Broken cover image in {md_path.name}",
                    detail=f"URL returned error: {str(e)[:100]}. URL: {img_url[:80]}",
                    file_path=fname,
                    auto_fixable=True,
                    fix_prompt=(
                        f"The cover image in {fname} is broken. "
                        f"Run: python -m pipeline.modify_run --fix-images {fname}"
                    ),
                ))

        # Check for broken internal links
        internal_links = re.findall(r'\[([^\]]*)\]\((/posts/[^)]+)\)', body)
        for link_text, link_href in internal_links:
            slug = link_href.strip("/").split("/")[-1]
            matching = list(_POSTS_DIR.glob(f"*{slug}*"))
            if not matching:
                findings.append(Finding(
                    severity="MEDIUM",
                    category="content",
                    title=f"Broken internal link in {md_path.name}",
                    detail=f"Link to '{link_href}' (text: '{link_text[:40]}') points to non-existent article.",
                    file_path=fname,
                    fix_prompt=(
                        f"In {fname}, the internal link to '{link_href}' is broken. "
                        f"Either remove the link or update it to point to an existing article. "
                        f"Run: python -m pipeline.modify_run --fix-links {fname}"
                    ),
                ))

        # Check for content injection (script/iframe/javascript:)
        injection_patterns = [
            (r'<script\b', "Script tag injection"),
            (r'<iframe\b', "Iframe injection"),
            (r'javascript:', "JavaScript protocol injection"),
            (r'on\w+\s*=\s*["\']', "Inline event handler injection"),
        ]
        for pat, desc in injection_patterns:
            for line_num, line in enumerate(body.split("\n"), 1):
                if re.search(pat, line, re.IGNORECASE):
                    findings.append(Finding(
                        severity="CRITICAL",
                        category="content",
                        title=f"{desc} in {md_path.name}",
                        detail=f"Line {line_num}: Suspicious pattern found.",
                        file_path=fname,
                        line_number=line_num,
                        auto_fixable=True,
                        fix_prompt=f"In {fname} line {line_num}, remove the injected content: {desc}.",
                    ))

    return findings


# ---------------------------------------------------------------------------
# Scanner 7: API key rotation age
# ---------------------------------------------------------------------------
def scan_api_key_rotation() -> list[Finding]:
    """Check how old each API key is based on tracked rotation dates."""
    findings: list[Finding] = []
    config = _load_config()
    rotation_dates = config.get("key_rotation_dates", {})
    thresholds = config.get("rotation_thresholds", {})
    warn_days = thresholds.get("warn_days", 90)
    crit_days = thresholds.get("critical_days", 180)

    today = datetime.now(timezone.utc).date()

    for key_name, last_rotated_str in rotation_dates.items():
        try:
            last_rotated = datetime.strptime(last_rotated_str, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            findings.append(Finding(
                severity="MEDIUM",
                category="key_rotation",
                title=f"Invalid rotation date for {key_name}",
                detail=f"Value '{last_rotated_str}' is not a valid date. Update security_config.json.",
                file_path="pipeline/config/security_config.json",
                fix_prompt=f"Update the key_rotation_dates.{key_name} value in security_config.json to a valid YYYY-MM-DD date.",
            ))
            continue

        age_days = (today - last_rotated).days

        if age_days > crit_days:
            findings.append(Finding(
                severity="HIGH",
                category="key_rotation",
                title=f"{key_name} not rotated in {age_days} days",
                detail=f"Last rotated: {last_rotated_str}. Threshold: {crit_days} days.",
                file_path="pipeline/config/security_config.json",
                fix_prompt=(
                    f"Rotate {key_name}: generate a new key from the provider, update it in "
                    f"GitHub Secrets and .env, then update key_rotation_dates.{key_name} "
                    f"in security_config.json to today's date."
                ),
            ))
        elif age_days > warn_days:
            findings.append(Finding(
                severity="MEDIUM",
                category="key_rotation",
                title=f"{key_name} approaching rotation deadline ({age_days} days old)",
                detail=f"Last rotated: {last_rotated_str}. Warning threshold: {warn_days} days.",
                file_path="pipeline/config/security_config.json",
                fix_prompt=(
                    f"Consider rotating {key_name} soon. It was last rotated {age_days} days ago. "
                    f"After rotation, update key_rotation_dates.{key_name} in security_config.json."
                ),
            ))

    return findings


# ---------------------------------------------------------------------------
# Auto-fix for CRITICAL findings
# ---------------------------------------------------------------------------
def attempt_auto_fix(finding: Finding) -> bool:
    """Attempt to automatically fix a CRITICAL finding. Returns True if fixed."""
    if not finding.auto_fixable:
        return False

    full_path = _REPO_ROOT / finding.file_path if finding.file_path else None

    # Secret redaction
    if finding.category == "secret" and full_path and full_path.exists():
        try:
            content = full_path.read_text(encoding="utf-8")
            lines = content.split("\n")
            if 0 < finding.line_number <= len(lines):
                line = lines[finding.line_number - 1]
                # Redact any long alphanumeric string that looks like a key
                redacted = re.sub(
                    r'(["\'])[A-Za-z0-9+/=_-]{16,}(["\'])',
                    r'\1REDACTED_BY_SECURITY_SCAN\2',
                    line
                )
                if redacted != line:
                    lines[finding.line_number - 1] = redacted
                    full_path.write_text("\n".join(lines), encoding="utf-8")
                    print(f"    [AUTO-FIX] Redacted secret in {finding.file_path}:{finding.line_number}")
                    return True
        except Exception as e:
            print(f"    [AUTO-FIX FAILED] {e}")
        return False

    # Content injection removal
    if finding.category == "content" and "injection" in finding.title.lower():
        if full_path and full_path.exists():
            try:
                content = full_path.read_text(encoding="utf-8")
                cleaned = re.sub(r'<script\b[^>]*>.*?</script>', '', content, flags=re.DOTALL | re.IGNORECASE)
                cleaned = re.sub(r'<iframe\b[^>]*>.*?</iframe>', '', cleaned, flags=re.DOTALL | re.IGNORECASE)
                if cleaned != content:
                    full_path.write_text(cleaned, encoding="utf-8")
                    print(f"    [AUTO-FIX] Stripped injected content from {finding.file_path}")
                    return True
            except Exception as e:
                print(f"    [AUTO-FIX FAILED] {e}")
        return False

    # Broken cover image -- delegate to modify_run
    if finding.category == "content" and "cover image" in finding.title.lower():
        if full_path and full_path.exists():
            try:
                from pipeline.modify_run import fix_images
                result = fix_images(full_path)
                if result:
                    print(f"    [AUTO-FIX] Re-fetched cover image for {finding.file_path}")
                    return True
            except Exception as e:
                print(f"    [AUTO-FIX FAILED] Could not re-fetch image: {e}")
        return False

    return False


# ---------------------------------------------------------------------------
# Critical alert email
# ---------------------------------------------------------------------------
def send_critical_alert(findings: list[Finding]) -> None:
    """Send an immediate email alert for CRITICAL findings."""
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        print("  [WARN] No RESEND_API_KEY, cannot send critical alert email.")
        return

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    fixed_count = sum(1 for f in findings if f.fixed)
    unfixed_count = len(findings) - fixed_count

    rows = ""
    for f in findings:
        status = '<span style="color:#10b981;font-weight:700">AUTO-FIXED</span>' if f.fixed else '<span style="color:#ef4444;font-weight:700">NEEDS ACTION</span>'
        rows += f"""<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">{f.category}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">{f.title}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">{f.file_path or 'N/A'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">{status}</td>
        </tr>"""

    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto">
<tr><td style="background:#dc2626;padding:24px 32px;border-radius:12px 12px 0 0">
<h1 style="color:#fff;margin:0;font-size:20px">CRITICAL Security Alert</h1>
<p style="color:#fecaca;margin:8px 0 0;font-size:14px">Particle Post -- {today}</p>
</td></tr>
<tr><td style="background:#fff;padding:24px 32px">
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">
The daily security scan detected <strong>{len(findings)} CRITICAL</strong> finding(s).
{f'<br><strong>{fixed_count}</strong> were auto-fixed.' if fixed_count else ''}
{f'<br><strong style="color:#dc2626">{unfixed_count}</strong> require manual action.' if unfixed_count else ''}
</p>
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse">
<tr style="background:#f1f5f9">
<th style="padding:8px 12px;text-align:left;font-weight:600">Category</th>
<th style="padding:8px 12px;text-align:left;font-weight:600">Finding</th>
<th style="padding:8px 12px;text-align:left;font-weight:600">File</th>
<th style="padding:8px 12px;text-align:left;font-weight:600">Status</th>
</tr>
{rows}
</table>
</td></tr>
<tr><td style="background:#f1f5f9;padding:16px 32px;border-radius:0 0 12px 12px;font-size:12px;color:#6b7280;text-align:center">
Particle Post Security Agent -- automated scan
</td></tr>
</table></body></html>"""

    payload = json.dumps({
        "from": FROM_EMAIL,
        "to": [RECIPIENT],
        "subject": f"[CRITICAL] Particle Post Security Alert -- {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
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
            print(f"  Critical alert email sent. Response: {resp.read().decode()}")
    except Exception as e:
        print(f"  [ERROR] Failed to send critical alert: {e}")


# ---------------------------------------------------------------------------
# Trigger fix-articles workflow
# ---------------------------------------------------------------------------
def trigger_fix_workflow(fix_mode: str = "all") -> None:
    """Dispatch the fix-articles GitHub Actions workflow."""
    token = os.environ.get("GH_PAT", "")
    if not token:
        print("  [WARN] No GH_PAT, cannot trigger fix-articles workflow.")
        return

    payload = json.dumps({
        "ref": "main",
        "inputs": {"fix_mode": fix_mode},
    }).encode("utf-8")

    req = urllib.request.Request(
        f"https://api.github.com/repos/{GITHUB_REPO}/actions/workflows/fix-articles.yml/dispatches",
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15):
            print(f"  Triggered fix-articles workflow (mode: {fix_mode})")
    except Exception as e:
        print(f"  [WARN] Could not trigger fix-articles: {e}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    start_time = time.time()
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    print(f"\n{'='*60}")
    print(f"  PARTICLE POST -- SECURITY SCAN")
    print(f"  Date: {today_str}")
    print(f"{'='*60}\n")

    all_findings: list[Finding] = []
    scans_completed: list[str] = []

    # Run all 7 scanners
    scanners = [
        ("dependency",    scan_dependencies),
        ("code",          scan_code_security),
        ("secret",        scan_secrets),
        ("workflow",      scan_workflows),
        ("config",        scan_config_drift),
        ("content",       scan_content_integrity),
        ("key_rotation",  scan_api_key_rotation),
    ]

    for scan_name, scanner_fn in scanners:
        print(f"  [{scan_name.upper()}] Running scan...")
        try:
            results = scanner_fn()
            all_findings.extend(results)
            scans_completed.append(scan_name)
            counts = {}
            for f in results:
                counts[f.severity] = counts.get(f.severity, 0) + 1
            if results:
                print(f"    Found {len(results)} issue(s): {counts}")
            else:
                print(f"    Clean")
        except Exception as e:
            print(f"    [ERROR] Scanner failed: {e}")

    # Severity summary
    summary = {"critical": 0, "high": 0, "medium": 0, "low": 0, "auto_fixed": 0}
    for f in all_findings:
        key = f.severity.lower()
        if key in summary:
            summary[key] += 1

    print(f"\n  SUMMARY: {summary}")

    # Handle CRITICAL findings
    critical = [f for f in all_findings if f.severity == "CRITICAL"]
    if critical:
        print(f"\n  !!! {len(critical)} CRITICAL finding(s) -- attempting auto-fix...")
        for f in critical:
            if f.auto_fixable:
                success = attempt_auto_fix(f)
                f.fixed = success
                if success:
                    summary["auto_fixed"] += 1

        # Send alert
        send_critical_alert(critical)

        # Trigger content fixes if needed
        content_critical = [f for f in critical if f.category == "content" and not f.fixed]
        if content_critical:
            trigger_fix_workflow("all")

    # Write findings log
    _LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_path = _LOGS_DIR / f"{today_str}.json"
    log_data = {
        "date": today_str,
        "scan_duration_seconds": round(time.time() - start_time, 1),
        "summary": summary,
        "findings": [asdict(f) for f in all_findings],
        "scans_completed": scans_completed,
    }
    log_path.write_text(
        json.dumps(log_data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"\n  Log written to: {log_path}")

    # Update config with scan history
    config = _load_config()
    config["last_scan"] = today_str
    history = config.get("scan_history", [])
    history.append({
        "date": today_str,
        "critical": summary["critical"],
        "high": summary["high"],
        "medium": summary["medium"],
        "low": summary["low"],
        "auto_fixed": summary["auto_fixed"],
    })
    config["scan_history"] = history[-30:]  # Keep last 30 scans
    _save_config(config)

    elapsed = round(time.time() - start_time, 1)
    print(f"\n  Scan completed in {elapsed}s")
    print(f"{'='*60}\n")

    # Exit with error code if unfixed critical issues remain
    unfixed_critical = [f for f in critical if not f.fixed] if critical else []
    if unfixed_critical:
        print(f"  [EXIT 1] {len(unfixed_critical)} unfixed CRITICAL issue(s) remain.")
        sys.exit(1)


if __name__ == "__main__":
    main()
