import xml.etree.ElementTree as ET
from urllib.request import urlopen
from urllib.error import URLError
from crewai.tools import BaseTool


TRENDS_RSS_URL = "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US"


class GoogleTrendsTool(BaseTool):
    name: str = "google_trends"
    description: str = (
        "Fetch current trending search topics from Google Trends RSS feed. "
        "Returns a list of trending topics in the US with traffic estimates. "
        "No input required — just call with an empty string or 'fetch'."
    )

    def _run(self, query: str = "") -> str:
        try:
            with urlopen(TRENDS_RSS_URL, timeout=10) as response:
                xml_data = response.read()
            root = ET.fromstring(xml_data)
            ns = {"ht": "https://trends.google.com/trends/trendingsearches/daily"}
            items = root.findall(".//item")
            trends = []
            for item in items[:20]:
                title_el = item.find("title")
                traffic_el = item.find("ht:approx_traffic", ns)
                title = title_el.text if title_el is not None else "Unknown"
                traffic = traffic_el.text if traffic_el is not None else "N/A"
                trends.append(f"- {title} (approx traffic: {traffic})")
            return "TRENDING NOW (US):\n" + "\n".join(trends)
        except URLError as e:
            return f"Google Trends fetch error: {str(e)}"
        except ET.ParseError as e:
            return f"Google Trends parse error: {str(e)}"
