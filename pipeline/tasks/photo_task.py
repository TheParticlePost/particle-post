from crewai import Task, Agent


def build_photo_task(agent: Agent, editing_task: Task, seo_task: Task) -> Task:
    return Task(
        description=(
            "Find the best royalty-free image for this article.\n\n"
            "Strategy:\n"
            "1. Extract 3 visual concepts from the article title and opening paragraph.\n"
            "   Good concepts: 'artificial intelligence data', 'financial technology', "
            "'stock market analysis', 'business meeting', 'neural network visualization'\n"
            "   Bad concepts: generic words like 'technology', 'business', 'finance' alone.\n"
            "2. Try pexels_image with each concept (3 separate tool calls).\n"
            "3. If all Pexels queries fail or return no suitable image, "
            "try unsplash_image with the primary keyword.\n"
            "4. Pick the best result: landscape orientation preferred, "
            "no visible text burned into the image.\n\n"
            "Output only valid JSON:\n"
            "{\n"
            '  "image_url": "https://...",\n'
            '  "alt_text": "Descriptive alt text for the image",\n'
            '  "photographer_name": "Name",\n'
            '  "photographer_url": "https://...",\n'
            '  "source": "pexels" or "unsplash"\n'
            "}"
        ),
        expected_output=(
            "A valid JSON object with image_url, alt_text, photographer_name, "
            "photographer_url, and source."
        ),
        agent=agent,
        context=[editing_task, seo_task],
    )
