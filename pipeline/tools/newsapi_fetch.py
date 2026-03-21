import os
import json
from urllib.request import urlopen, Request
from urllib.parse import urlencode
from urllib.error import URLError
from crewai.tools import BaseTool


class NewsApiFetchTool(BaseTool):
    name: str = "newsapi_fetch"
    description: str = (
        "Fetch the latest news headlines about AI, business, and finance from NewsAPI. "
        "Returns up to 20 recent headlines with source and URL. "
        "Input should be a topic keyword like 'artificial intelligence finance' "
        "or 'AI business technology'."
    )

    def _run(self, query: str) -> str:
        api_key = os.environ.get("NEWS_API_KEY", "")
        if not api_key:
            return "NEWS_API_KEY not set — skipping NewsAPI fetch."
        params = urlencode({
            "q": query or "artificial intelligence business finance",
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": 20,
            "apiKey": api_key,
        })
        url = f"https://newsapi.org/v2/everything?{params}"
        try:
            req = Request(url, headers={"User-Agent": "ParticlePost/1.0"})
            with urlopen(req, timeout=10) as response:
                data = json.loads(response.read())
            articles = data.get("articles", [])
            if not articles:
                return "No articles found."
            lines = ["RECENT HEADLINES:"]
            for a in articles:
                lines.append(
                    f"- [{a.get('source', {}).get('name', 'Unknown')}] "
                    f"{a.get('title', '')} "
                    f"({a.get('publishedAt', '')[:10]})\n"
                    f"  URL: {a.get('url', '')}"
                )
            return "\n".join(lines)
        except URLError as e:
            return f"NewsAPI fetch error: {str(e)}"
        except (json.JSONDecodeError, KeyError) as e:
            return f"NewsAPI parse error: {str(e)}"
