import os
import json
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlencode
from urllib.error import URLError
from crewai.tools import BaseTool


# Directory for locally-saved Pixabay images (Pixabay /get/ URLs expire)
_IMAGES_DIR = Path(__file__).resolve().parents[2] / "blog" / "public" / "images" / "posts"


class PixabayImageTool(BaseTool):
    name: str = "pixabay_image"
    description: str = (
        "Search for a royalty-free image on Pixabay (fallback when Pexels has no results). "
        "No API review required. Input should be a descriptive keyword string. "
        "Returns image URL, alt text, and attribution. "
        "Images are downloaded locally because Pixabay URLs expire."
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
            source_url = photo.get("largeImageURL", photo.get("webformatURL", ""))

            # Download image locally since Pixabay /get/ URLs expire
            local_path = self._download_image(source_url, photo.get("id", "unknown"))
            if local_path:
                image_url = f"/images/posts/{local_path.name}"
            else:
                # Fallback: use API URL directly (may expire)
                image_url = source_url

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

    def _download_image(self, url: str, image_id) -> Path | None:
        """Download image to local public directory. Returns path or None on failure."""
        if not url:
            return None
        try:
            _IMAGES_DIR.mkdir(parents=True, exist_ok=True)
            ext = ".jpg"
            if ".png" in url.lower():
                ext = ".png"
            local_file = _IMAGES_DIR / f"pixabay-{image_id}{ext}"
            if local_file.exists():
                return local_file
            req = Request(url, headers={"User-Agent": "ParticlePost/1.0"})
            with urlopen(req, timeout=30) as resp:
                local_file.write_bytes(resp.read())
            return local_file
        except Exception:
            return None
