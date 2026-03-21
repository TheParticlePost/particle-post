import os
from crewai.tools import BaseTool
from pydantic import Field
from tavily import TavilyClient


class TavilySearchTool(BaseTool):
    name: str = "tavily_search"
    description: str = (
        "Search the web for current news and information using Tavily AI. "
        "Returns summarized, AI-ready content with source URLs. "
        "Input should be a specific search query string."
    )
    _client: TavilyClient = None

    def _run(self, query: str) -> str:
        if self._client is None:
            self._client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])
        try:
            response = self._client.search(
                query=query,
                search_depth="advanced",
                max_results=5,
                include_answer=True,
            )
            answer = response.get("answer", "")
            results = response.get("results", [])
            output_parts = []
            if answer:
                output_parts.append(f"SUMMARY: {answer}\n")
            for i, r in enumerate(results, 1):
                output_parts.append(
                    f"[{i}] {r.get('title', '')}\n"
                    f"URL: {r.get('url', '')}\n"
                    f"Content: {r.get('content', '')[:500]}\n"
                )
            return "\n".join(output_parts)
        except Exception as e:
            return f"Search error: {str(e)}"
