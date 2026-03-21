from crewai import Task, Agent
from pipeline.utils.date_helpers import utc_date_str


def build_publishing_task(
    agent: Agent,
    formatting_task: Task,
    seo_task: Task,
    selection_task: Task,
) -> Task:
    date_str = utc_date_str()
    return Task(
        description=(
            "Write the formatted markdown post to disk using the file_writer tool.\n\n"
            "Steps:\n"
            "1. Extract the slug from the SEO package output.\n"
            "2. Extract the title from the topic selection output.\n"
            "3. Extract the tags from the SEO package output.\n"
            "4. Construct the filename as: {date_str}-{{slug}}.md\n"
            "5. Call the file_writer tool with this exact JSON structure:\n"
            "{\n"
            '  "filename": "{date_str}-{{slug}}.md",\n'
            '  "content": "...full markdown content from formatting task...",\n'
            '  "title": "...article title...",\n'
            '  "slug": "...slug...",\n'
            '  "tags": ["tag1", "tag2"]\n'
            "}\n\n"
            "The 'content' field must be the COMPLETE markdown output from the formatting task, "
            "starting with --- and including all frontmatter and body text.\n\n"
            "Report the file path returned by the tool."
        ).replace("{date_str}", date_str),
        expected_output=(
            "Confirmation message with the file path where the post was written, "
            "e.g. 'Post written to: blog/content/posts/2026-03-21-ai-fraud-detection-banks.md'"
        ),
        agent=agent,
        context=[formatting_task, seo_task, selection_task],
    )
