from crewai import Task, Agent
from pipeline.utils.date_helpers import utc_date_str, utc_now_iso


def build_formatting_task(
    agent: Agent,
    editing_task: Task,
    seo_gso_task: Task,
    photo_task: Task,
    selection_task: Task,
) -> Task:
    date_str = utc_date_str()
    timestamp_iso = utc_now_iso()
    return Task(
        description=(
            f"Assemble the final Hugo markdown file from all previous outputs.\n\n"
            f"Publish timestamp: {timestamp_iso}\n"
            f"Filename date: {date_str}\n\n"
            "Steps:\n"
            "1. Parse the SEO/GSO package JSON from the seo_gso_task context to get: "
            "   slug, meta_title, meta_description, primary_keyword, tags, categories, "
            "   has_faq, faq_questions, schema_type, internal_link_targets.\n"
            "2. Parse the photo JSON to get: image_url, alt_text, photographer_name, "
            "   photographer_url, source.\n"
            "3. Extract the article body from the editor's [REVISED ARTICLE] block "
            "   (everything between [REVISED ARTICLE] and [EDIT LOG]). "
            "   If not found, fall back to the [RESTRUCTURED ARTICLE] block from seo_gso_task.\n"
            f"4. Build the filename: {date_str}-<slug>.md\n"
            "5. Build YAML frontmatter with ALL of these fields:\n"
            f"   title, date (use the exact publish timestamp provided above: {timestamp_iso} — NOT midnight T00:00:00Z), slug, description, keywords (list), "
            "   author, tags (list), categories (list),\n"
            "   cover (nested YAML block with keys: image, alt, caption),\n"
            "   image_credit_name, image_credit_url, image_credit_source,\n"
            "   schema_type (string from SEO package),\n"
            "   has_faq (boolean from SEO package — true or false),\n"
            "   ShowToc: true, TocOpen: false, draft: false\n"
            "   IMPORTANT: cover must be nested YAML, not flat fields. Example:\n"
            "     cover:\n"
            "       image: \"https://example.com/photo.jpg\"\n"
            "       alt: \"Description of image\"\n"
            "       caption: \"\"\n"
            "   If has_faq is true, also include faq_pairs as a YAML list of maps:\n"
            "     faq_pairs:\n"
            "       - q: \"First question?\"\n"
            "         a: \"First answer.\"\n"
            "       - q: \"Second question?\"\n"
            "         a: \"Second answer.\"\n"
            "   Use the faq_questions array from the SEO package for these values.\n"
            "6. Format the article body:\n"
            "   - Use ## for section headings (from the labeled sections in the article)\n"
            "   - Convert 'KEY TAKEAWAY: ...' to a blockquote: > **Key Takeaway:** ...\n"
            "   - Add the stat-box shortcode where a key statistic appears: "
            "     {{< stat-box number='X%' label='description' source='Source Name' >}}\n"
            "   - Add internal markdown links: use internal_link_targets from SEO package "
            "     to link relevant terms to those posts (e.g. [anchor text](/posts/slug/))\n"
            "   - End with ## Sources section listing all source URLs\n\n"
            "Output the complete .md file content ONLY. "
            "Start immediately with '---' (the frontmatter opening). "
            "No explanations, no code fences around the output."
        ),
        expected_output=(
            "A complete Hugo-compatible .md file starting with --- (YAML frontmatter) "
            "and containing the full formatted article with proper heading hierarchy, "
            "blockquote for key takeaway, internal links, and sources section. "
            "Frontmatter includes has_faq, schema_type, and faq_pairs (when has_faq=true)."
        ),
        agent=agent,
        context=[editing_task, seo_gso_task, photo_task, selection_task],
    )
