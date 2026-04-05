"""
Upload PNG files to Supabase Storage.
Uses only stdlib (urllib) -- no extra dependencies.
"""

from __future__ import annotations

import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def upload_to_supabase(
    file_path: str,
    bucket: str,
    object_name: str,
) -> str:
    """Upload a file to Supabase Storage and return the public URL.

    Requires environment variables:
        SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
        SUPABASE_SERVICE_ROLE_KEY

    The target bucket must already exist and be configured as public.
    Returns the public URL on success, or an empty string on failure /
    missing configuration.
    """
    url = os.environ.get("SUPABASE_URL") or os.environ.get(
        "NEXT_PUBLIC_SUPABASE_URL", ""
    )
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not url or not key:
        print("  [Upload] Supabase not configured, skipping upload")
        return ""

    upload_url = f"{url}/storage/v1/object/{bucket}/{object_name}"

    with open(file_path, "rb") as f:
        data = f.read()

    req = Request(
        upload_url,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "image/png",
            "x-upsert": "true",
        },
    )

    try:
        with urlopen(req, timeout=30) as resp:
            if resp.status in (200, 201):
                public_url = (
                    f"{url}/storage/v1/object/public/{bucket}/{object_name}"
                )
                print(f"  [Upload] Uploaded to {public_url}")
                return public_url
            print(f"  [Upload] Unexpected status {resp.status}")
    except HTTPError as exc:
        print(f"  [Upload] HTTP {exc.code}: {exc.reason}")
    except URLError as exc:
        print(f"  [Upload] Network error: {exc.reason}")
    except Exception as exc:  # noqa: BLE001
        print(f"  [Upload] Failed: {exc}")

    return ""
