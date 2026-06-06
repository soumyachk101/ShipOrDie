import logging
import asyncio
from backend.tools.reddit_tool import RedditTool
from backend.tools.producthunt_tool import ProductHuntTool
from backend.tools.hackernews_tool import HackerNewsTool
from backend.tools.google_trends_tool import GoogleTrendsTool

logger = logging.getLogger(__name__)

class ScraperAgent:
    def __init__(self):
        self.tools = [
            RedditTool(),
            ProductHuntTool(),
            HackerNewsTool(),
            GoogleTrendsTool()
        ]

    async def run(self) -> list[dict]:
        """Runs all scraper tools in parallel and returns aggregated normalized signals."""
        logger.info("Starting Scraper Agent pipeline...")
        tasks = [tool.fetch() for tool in self.tools]
        
        # Gather signals from all sources concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        aggregated_signals = []
        for i, res in enumerate(results):
            if isinstance(res, Exception):
                logger.error(f"Error fetching signals from tool {self.tools[i].__class__.__name__}: {res}")
            elif isinstance(res, list):
                aggregated_signals.extend(res)
                
        # Deduplicate signals based on text contents (rough check)
        deduplicated = []
        seen_texts = set()
        for signal in aggregated_signals:
            txt_lower = signal["text"].lower().strip()
            # Simple signature of first 50 chars to avoid duplicate posts
            sig = txt_lower[:50]
            if sig not in seen_texts:
                seen_texts.add(sig)
                deduplicated.append(signal)
                
        logger.info(f"Scraper Agent completed. Collected {len(deduplicated)} unique market signals.")
        return deduplicated
