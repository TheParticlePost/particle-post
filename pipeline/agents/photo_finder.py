from crewai import Agent, LLM
from pipeline.tools.pexels_image import PexelsImageTool
from pipeline.tools.pixabay_image import PixabayImageTool


def build_photo_finder() -> Agent:
    return Agent(
        role="Photo Editor",
        goal=(
            "Find the single best royalty-free image for the article. "
            "Try Pexels first with 3 different keyword queries. "
            "Fall back to Pixabay if Pexels returns no suitable results. "
            "Return image URL, alt text, and full photographer attribution as JSON."
        ),
        backstory=(
            "You are a photo editor who selects images for a business publication. "
            "You know that the best images for AI/Finance articles are abstract tech visuals, "
            "data visualizations, office environments, or financial symbols — never cheesy "
            "stock art with too-happy people. You prefer landscape orientation, minimum 1280px wide, "
            "and no images with text burned into them. "
            "You always try multiple search queries before giving up. "
            "If all API queries fail or return errors, return a fallback JSON using a "
            "placeholder image URL from picsum.photos (e.g. https://picsum.photos/1600/900). "
            "Output strict JSON only — no prose."
        ),
        tools=[PexelsImageTool(), PixabayImageTool()],
        llm=LLM(model="anthropic/claude-haiku-4-5-20251001", max_tokens=600),
        verbose=True,
        allow_delegation=False,
    )
