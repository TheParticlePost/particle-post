from pipeline.utils.date_helpers import utc_now_iso


def build_frontmatter(
    title: str,
    slug: str,
    description: str,
    keywords: list[str],
    tags: list[str],
    categories: list[str],
    image_url: str,
    image_alt: str,
    image_credit_name: str,
    image_credit_url: str,
    image_credit_source: str,
    author: str = "Particle Post Editorial Team",
) -> str:
    """Build a YAML frontmatter block for a Hugo post."""

    def _yaml_list(items: list[str]) -> str:
        return "[" + ", ".join(f'"{i}"' for i in items) + "]"

    lines = [
        "---",
        f'title: "{_escape(title)}"',
        f'date: "{utc_now_iso()}"',
        f'slug: "{slug}"',
        f'description: "{_escape(description)}"',
        f"keywords: {_yaml_list(keywords)}",
        f'author: "{author}"',
        f"tags: {_yaml_list(tags)}",
        f"categories: {_yaml_list(categories)}",
        f'image: "{image_url}"',
        f'image_alt: "{_escape(image_alt)}"',
        f'image_credit_name: "{_escape(image_credit_name)}"',
        f'image_credit_url: "{image_credit_url}"',
        f'image_credit_source: "{image_credit_source}"',
        "ShowToc: true",
        "TocOpen: false",
        "draft: false",
        "---",
    ]
    return "\n".join(lines)


def _escape(text: str) -> str:
    """Escape double quotes in YAML string values."""
    return text.replace('"', '\\"')
