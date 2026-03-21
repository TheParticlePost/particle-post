import os
import json
from urllib.request import urlopen, Request
from urllib.parse import urlencode
from urllib.error import URLError
from crewai.tools import BaseTool


class UnsplashImageTool(BaseTool):
    name: str = "unsplash_image"
    description: str = (
        "Search for a royalty-free image on Unsplash (fallback when Pexels has no results). "
        "Input should be a descriptive keyword string. "
        "Returns image URL, alt text, and photographer attribution."
    )

    def _run(self, query: str) -> str:
        access_key = os.environ.get("UNSPLASH_ACCESS_KEY", "")
        if not access_key:
            return json.dumps({"error": "UNSPLASH_ACCESS_KEY not set"})
        params = urlencode({
            "query": query,
            "orientation": "landscape",
            "per_page": 5,
            "client_id": access_key,
        })
        url = f"https://api.unsplash.com/search/photos?{params}"
        try:
            req = Request(url, headers={"Accept-Version": "v1"})
            with urlopen(req, timeout=10) as response:
                data = json.loads(response.read())
            results = data.get("results", [])
            if not results:
                return json.dumps({"error": f"No Unsplash results for '{query}'"})
            photo = results[0]
            user = photo.get("user", {})
            return json.dumps({
                "image_url": photo["urls"]["regular"],
                "alt_text": photo.get("alt_description") or query,
                "photographer_name": user.get("name", ""),
                "photographer_url": user.get("links", {}).get("html", ""),
                "source": "unsplash",
            })
        except URLError as e:
            return json.dumps({"error": f"Unsplash fetch error: {str(e)}"})
        except (json.JSONDecodeError, KeyError) as e:
            return json.dumps({"error": f"Unsplash parse error: {str(e)}"})
