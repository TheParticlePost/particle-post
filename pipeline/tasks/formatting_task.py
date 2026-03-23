from crewai import Task, Agent
from pipeline.utils.date_helpers import utc_date_str


def build_formatting_task(
    agent: Agent,
    editing_task: Task,
    seo_task: Task,
    photo_task: Task,
    selection_task: Task,
) -> Task:
    date_str = utc_date_str()
    return Task(
        description=(
            f"Assemble the final Hugo markdown file from all previous outputs.\n\n"
            f"Today's date: {date_str}\n\n"
            "Steps:\n"
            "1. Parse the SEO package JSON to get: slug, meta_title, meta_description, "
            "   primary_keyword, tags, categories.\n"
            "2. Parse the photo JSON to get: image_url, alt_text, photographer_name, "
            "   photographer_url, source.\n"
            "3. Extract the [REVISED ARTICLE] section from the editor's output "
            "   (everything between [REVISED ARTICLE] and [EDIT LOG]).\n"
            f"4. Build the filename: {date_str}-<slug>.md\n"
            "5. Build YAML frontmatter with ALL of these fields:\n"
            "   title, date (ISO 8601 UTC), slug, description, keywords (list), "
            "   author, tags (list), categories (list),\n"
            "   cover (nested YAML block with keys: image, alt, caption),\n"
            "   image_credit_name, image_credit_url, image_credit_source, "
            "   ShowToc: true, TocOpen: false, draft: false\n"
            "   IMPORTANT: cover must be nested YAML, not flat fields. Example:\n"
            "     cover:\n"
            "       image: \"https://example.com/photo.jpg\"\n"
            "       alt: \"Description of image\"\n"
            "       caption: \"\"\n"
            "6. Format the article body:\n"
            "   - Use ## for section headings (from the labeled sections in the article)\n"
            "   - Convert 'KEY TAKEAWAY: ...' to a blockquote: > **Key Takeaway:** ...\n"
            "   - Add the stat-box shortcode where a key statistic appears: "
            "     {{< stat-box number='X%' label='description' source='Source Name' >}}\n"
            "   - End with ## Sources section listing all source URLs\n\n"
            "Output the complete .md file content ONLY. "
            "Start immediately with '---' (the frontmatter opening). "
            "No explanations, no code fences around the output."
        ),
        expected_output=(
            "A complete Hugo-compatible .md file starting with --- (YAML frontmatter) "
            "and containing the full formatted article with proper heading hierarchy, "
            "blockquote for key takeaway, and sources section."
        ),
        agent=agent,
        context=[editing_task, seo_task, photo_task, selection_task],
    )
