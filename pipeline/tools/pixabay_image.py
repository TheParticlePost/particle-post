import os
import json
from urllib.request import urlopen, Request
from urllib.parse import urlencode
from urllib.error import URLError
from crewai.tools import BaseTool


class PixabayImageTool(BaseTool):
    name: str = "pixabay_image"
    description: str = (
        "Search for a royalty-free image on Pixabay (fallback when Pexels has no results). "
        "No API review required. Input should be a descriptive keyword string. "
        "Returns a direct CDN image URL, alt text, and attribution."
    )

    def _run(self, query: str) -> str:
        api_key = os.environ.get("PIXABAY_API_KEY", "")
        if not api_key:
            return json.dumps({"error": "PIXABAY_API_KEY not set"})
        params = urlencode({
            "key": api_key,
            "q": query,
            "image_type": "photo",
            "orientation": "horizontal",
            "category": "business",
            "min_width": 1280,
            "safesearch": "true",
            "per_page": 10,
            "order": "popular",
        })
        url = f"https://pixabay.com/api/?{params}"
        try:
            req = Request(url, headers={"User-Agent": "ParticlePost/1.0"})
            with urlopen(req, timeout=10) as response:
                data = json.loads(response.read())
            hits = data.get("hits", [])
            if not hits:
                return json.dumps({"error": f"No Pixabay results for '{query}'"})
            photo = hits[0]

            # Use webformatURL — stable Pixabay CDN URL that does NOT expire.
            # largeImageURL and /get/ URLs are temporary and expire after hours.
            # Use webformatURL (640px, stable CDN URL).
            # NEVER fall back to previewURL (150px thumbnail — produces blurry covers).
            image_url = photo.get("webformatURL", "")
            if not image_url or "pixabay.com/get/" in image_url:
                return json.dumps({"error": f"No stable Pixabay URL for '{query}' — try different keywords or use Pexels"})
            # Final safety: reject any /get/ URL — these always expire
            if "pixabay.com/get/" in image_url:
                return json.dumps({"error": "Pixabay returned only temporary URLs — use Pexels instead"})

            return json.dumps({
                "image_url": image_url,
                "alt_text": query,
                "photographer_name": photo.get("user", "Pixabay contributor"),
                "photographer_url": f"https://pixabay.com/users/{photo.get('user', '')}-{photo.get('user_id', '')}",
                "source": "pixabay",
            })
        except URLError as e:
            return json.dumps({"error": f"Pixabay fetch error: {str(e)}"})
        except (json.JSONDecodeError, KeyError) as e:
            return json.dumps({"error": f"Pixabay parse error: {str(e)}"})
