import os
import json
from urllib.request import urlopen, Request
from urllib.parse import urlencode
from urllib.error import URLError
from crewai.tools import BaseTool


class PexelsImageTool(BaseTool):
    name: str = "pexels_image"
    description: str = (
        "Search for a royalty-free image on Pexels. "
        "Input should be a descriptive keyword string (e.g. 'artificial intelligence data center'). "
        "Returns the best landscape image URL, alt text, and photographer attribution."
    )

    def _run(self, query: str) -> str:
        api_key = os.environ.get("PEXELS_API_KEY", "")
        if not api_key:
            return json.dumps({"error": "PEXELS_API_KEY not set"})
        params = urlencode({
            "query": query,
            "orientation": "landscape",
            "size": "large",
            "per_page": 10,
        })
        url = f"https://api.pexels.com/v1/search?{params}"
        try:
            req = Request(url, headers={"Authorization": api_key})
            with urlopen(req, timeout=10) as response:
                data = json.loads(response.read())
            photos = data.get("photos", [])
            if not photos:
                return json.dumps({"error": f"No Pexels results for '{query}'"})
            # Pick best photo: prefer >= 1920px wide, no text in alt
            best = None
            for photo in photos:
                w = photo.get("width", 0)
                if w >= 1920:
                    best = photo
                    break
            if best is None:
                best = photos[0]
            return json.dumps({
                "image_url": best["src"]["large2x"],
                "alt_text": best.get("alt", query),
                "photographer_name": best.get("photographer", ""),
                "photographer_url": best.get("photographer_url", ""),
                "source": "pexels",
            })
        except URLError as e:
            return json.dumps({"error": f"Pexels fetch error: {str(e)}"})
        except (json.JSONDecodeError, KeyError) as e:
            return json.dumps({"error": f"Pexels parse error: {str(e)}"})
