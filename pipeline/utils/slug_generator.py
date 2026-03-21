import re
import unicodedata


def generate_slug(title: str) -> str:
    """Convert a post title to a Hugo-compatible URL slug."""
    # Normalize unicode characters
    slug = unicodedata.normalize("NFKD", title)
    slug = slug.encode("ascii", "ignore").decode("ascii")
    # Lowercase
    slug = slug.lower()
    # Replace non-alphanumeric characters with hyphens
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    # Strip leading/trailing hyphens
    slug = slug.strip("-")
    # Collapse multiple hyphens
    slug = re.sub(r"-{2,}", "-", slug)
    # Truncate to 80 characters at a word boundary
    if len(slug) > 80:
        slug = slug[:80].rsplit("-", 1)[0]
    return slug
