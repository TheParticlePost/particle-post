"""
Hostinger API tool — DNS management and domain/hosting status for theparticlepost.com.

Capabilities:
  - Read all DNS records
  - Add a new DNS record (safe read-modify-write, no full zone replacement)
  - Delete a DNS record by type + name + content
  - Check domain status and hosting info

Auth: Bearer token via HOSTINGER_API_KEY env var (Hostinger hPanel → API Tokens).

API base: https://api.hostinger.com
Docs:     https://developers.hostinger.com
"""

import json
import os
import urllib.error
import urllib.request
from typing import Any

from crewai.tools import BaseTool

_DOMAIN   = "theparticlepost.com"
_BASE_URL = "https://api.hostinger.com"


def _headers() -> dict[str, str]:
    key = os.environ.get("HOSTINGER_API_KEY", "")
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type":  "application/json",
        "Accept":        "application/json",
    }


def _request(method: str, path: str, body: Any = None) -> tuple[int, Any]:
    """Make an API request. Returns (status_code, parsed_json_or_str)."""
    url = f"{_BASE_URL}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req  = urllib.request.Request(url, data=data, headers=_headers(), method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")[:400]
        try:
            return exc.code, json.loads(raw)
        except Exception:
            return exc.code, raw
    except Exception as exc:
        return 0, str(exc)


class HostingerTool(BaseTool):
    """
    Manage Hostinger DNS records and check domain/hosting status for theparticlepost.com.

    Input — one of:
      list_dns
        List all current DNS records.

      add_dns:{type}:{name}:{content}[:{ttl}]
        Add a DNS record. ttl is optional (default 3600).
        Examples:
          add_dns:TXT:@:google-site-verification=abc123
          add_dns:TXT:@:v=spf1 include:sendgrid.net ~all:3600
          add_dns:CNAME:www:theparticlepost.com

      delete_dns:{type}:{name}:{content}
        Delete a specific DNS record matching type + name + content exactly.
        Example:
          delete_dns:TXT:gsc:google-site-verification=oldtoken

      domain_status
        Show domain details (nameservers, registration, expiry, lock status).

      hosting_status
        Show hosting plan and website list.
    """

    name: str = "hostinger"
    description: str = (
        "Manage DNS records and check domain/hosting status for theparticlepost.com via Hostinger API.\n"
        "Input options:\n"
        "  'list_dns'                              — list all DNS records\n"
        "  'add_dns:{type}:{name}:{content}'       — add a DNS record (TXT, CNAME, A, etc.)\n"
        "  'delete_dns:{type}:{name}:{content}'    — delete a matching DNS record\n"
        "  'domain_status'                         — domain registration + nameserver details\n"
        "  'hosting_status'                        — hosting plan and website info\n"
        "Example: 'add_dns:TXT:@:google-site-verification=abc123' adds a TXT record at the root."
    )

    def _run(self, action: str) -> str:  # noqa: C901
        action = (action or "").strip()
        key = os.environ.get("HOSTINGER_API_KEY", "")
        if not key:
            return "[Hostinger] HOSTINGER_API_KEY not set."

        # ── list_dns ──────────────────────────────────────────────────────────
        if action == "list_dns":
            status, data = _request("GET", f"/api/dns/v1/zones/{_DOMAIN}")
            if status != 200:
                return f"[Hostinger] list_dns failed (HTTP {status}): {data}"
            records = data if isinstance(data, list) else data.get("records", data)
            if not records:
                return "[Hostinger] No DNS records found."
            lines = [f"═══ DNS Records — {_DOMAIN} ═══\n"]
            for r in records:
                rtype   = r.get("type", "?")
                name    = r.get("name", "@")
                content = r.get("content", r.get("value", ""))
                ttl     = r.get("ttl", "")
                lines.append(f"  {rtype:8} {name:30} {content}  (ttl={ttl})")
            return "\n".join(lines)

        # ── add_dns ───────────────────────────────────────────────────────────
        elif action.startswith("add_dns:"):
            parts = action[len("add_dns:"):].split(":", 3)
            if len(parts) < 3:
                return "[Hostinger] add_dns format: add_dns:{type}:{name}:{content}[:{ttl}]"
            rtype, name, content = parts[0].upper(), parts[1], parts[2]
            ttl = int(parts[3]) if len(parts) == 4 and parts[3].isdigit() else 3600

            # Safe read-modify-write: fetch existing records first
            status, data = _request("GET", f"/api/dns/v1/zones/{_DOMAIN}")
            if status != 200:
                return f"[Hostinger] Could not read current DNS records (HTTP {status}): {data}"

            current = data if isinstance(data, list) else data.get("records", [])
            new_record = {"type": rtype, "name": name, "content": content, "ttl": ttl}

            # Check for exact duplicate
            for r in current:
                if (r.get("type", "").upper() == rtype
                        and r.get("name", "") == name
                        and r.get("content", r.get("value", "")) == content):
                    return f"[Hostinger] Record already exists: {rtype} {name} → {content}"

            updated = current + [new_record]
            status, data = _request("PUT", f"/api/dns/v1/zones/{_DOMAIN}", updated)
            if status in (200, 201, 202, 204):
                return f"[Hostinger] ✓ Added {rtype} record: {name} → {content} (ttl={ttl})"
            return f"[Hostinger] add_dns failed (HTTP {status}): {data}"

        # ── delete_dns ────────────────────────────────────────────────────────
        elif action.startswith("delete_dns:"):
            parts = action[len("delete_dns:"):].split(":", 2)
            if len(parts) != 3:
                return "[Hostinger] delete_dns format: delete_dns:{type}:{name}:{content}"
            rtype, name, content = parts[0].upper(), parts[1], parts[2]

            status, data = _request("GET", f"/api/dns/v1/zones/{_DOMAIN}")
            if status != 200:
                return f"[Hostinger] Could not read current DNS records (HTTP {status}): {data}"

            current = data if isinstance(data, list) else data.get("records", [])
            filtered = [
                r for r in current
                if not (
                    r.get("type", "").upper() == rtype
                    and r.get("name", "") == name
                    and r.get("content", r.get("value", "")) == content
                )
            ]

            if len(filtered) == len(current):
                return f"[Hostinger] No matching record found: {rtype} {name} → {content}"

            status, data = _request("PUT", f"/api/dns/v1/zones/{_DOMAIN}", filtered)
            if status in (200, 201, 202, 204):
                return f"[Hostinger] ✓ Deleted {rtype} record: {name} → {content}"
            return f"[Hostinger] delete_dns failed (HTTP {status}): {data}"

        # ── domain_status ─────────────────────────────────────────────────────
        elif action == "domain_status":
            status, data = _request("GET", f"/api/domains/v1/portfolio/{_DOMAIN}")
            if status != 200:
                return f"[Hostinger] domain_status failed (HTTP {status}): {data}"
            ns    = data.get("nameservers", [])
            expiry = data.get("expiresAt", data.get("expiry_date", "?"))
            locked = data.get("domainLock", data.get("transfer_lock", "?"))
            privacy = data.get("privacyProtection", "?")
            lines = [
                f"═══ Domain Status — {_DOMAIN} ═══\n",
                f"  Expires        : {expiry}",
                f"  Transfer lock  : {locked}",
                f"  WHOIS privacy  : {privacy}",
                f"  Nameservers    : {', '.join(ns) if ns else 'N/A'}",
            ]
            return "\n".join(lines)

        # ── hosting_status ────────────────────────────────────────────────────
        elif action == "hosting_status":
            status, orders = _request("GET", "/api/hosting/v1/orders")
            status2, sites = _request("GET", "/api/hosting/v1/websites")
            lines = [f"═══ Hosting Status — {_DOMAIN} ═══\n"]
            if status == 200:
                order_list = orders if isinstance(orders, list) else orders.get("data", [])
                for o in order_list[:5]:
                    plan = o.get("plan", o.get("name", "?"))
                    exp  = o.get("expiresAt", o.get("expiry", "?"))
                    lines.append(f"  Plan: {plan} — expires {exp}")
            if status2 == 200:
                site_list = sites if isinstance(sites, list) else sites.get("data", [])
                for s in site_list[:5]:
                    domain = s.get("domain", s.get("name", "?"))
                    state  = s.get("status", s.get("state", "?"))
                    lines.append(f"  Site: {domain} [{state}]")
            if len(lines) == 1:
                lines.append("  (No hosting data returned — check API key permissions)")
            return "\n".join(lines)

        else:
            return (
                f"[Hostinger] Unknown action '{action}'. "
                "Use: list_dns, add_dns:TYPE:NAME:CONTENT, delete_dns:TYPE:NAME:CONTENT, "
                "domain_status, or hosting_status."
            )
