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
            "3. Extract the tags list from the SEO package output.\n"
            "4. Construct the filename as: {date_str}-<slug>.md\n"
            "5. Call the file_writer tool passing each argument by name:\n"
            "   - filename: the constructed filename string\n"
            "   - content: the COMPLETE markdown from the formatting task (starts with ---)\n"
            "   - title: the article title string\n"
            "   - slug: the slug string\n"
            "   - tags: a JSON array string of tags, e.g. '[\"AI\", \"Finance\"]'\n\n"
            "IMPORTANT: Pass each field as a separate named argument to the tool. "
            "Do NOT wrap them in a JSON string or a dict.\n\n"
            "Report the file path returned by the tool."
        ).replace("{date_str}", date_str),
        expected_output=(
            "Confirmation message with the file path where the post was written, "
            "e.g. 'Post written to: blog/content/posts/2026-03-21-ai-fraud-detection-banks.md'"
        ),
        agent=agent,
        context=[formatting_task, seo_task, selection_task],
    )
