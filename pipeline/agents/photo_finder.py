from crewai import Agent
from langchain_anthropic import ChatAnthropic
from pipeline.tools.pexels_image import PexelsImageTool
from pipeline.tools.unsplash_image import UnsplashImageTool


def build_photo_finder() -> Agent:
    return Agent(
        role="Photo Editor",
        goal=(
            "Find the single best royalty-free image for the article. "
            "Try Pexels first with 3 different keyword queries. "
            "Fall back to Unsplash if Pexels returns no suitable results. "
            "Return image URL, alt text, and full photographer attribution as JSON."
        ),
        backstory=(
            "You are a photo editor who selects images for a business publication. "
            "You know that the best images for AI/Finance articles are abstract tech visuals, "
            "data visualizations, office environments, or financial symbols — never cheesy "
            "stock art with too-happy people. You prefer landscape orientation, minimum 1920px wide, "
            "and no images with text burned into them. "
            "You always try multiple search queries before giving up. "
            "Output strict JSON only — no prose."
        ),
        tools=[PexelsImageTool(), UnsplashImageTool()],
        llm=ChatAnthropic(model="claude-haiku-4-5-20251001", max_tokens=600),
        verbose=True,
        allow_delegation=False,
    )
