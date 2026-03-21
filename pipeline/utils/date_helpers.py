from datetime import datetime, timezone


def utc_now_iso() -> str:
    """Return current UTC time in ISO 8601 format for Hugo frontmatter."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def utc_date_str() -> str:
    """Return current UTC date as YYYY-MM-DD (used in filenames)."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def utc_now_timestamp() -> str:
    """Return compact timestamp for unique filenames: YYYYMMDD-HHMM."""
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
