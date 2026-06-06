import logging
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)

# Fallback/mock signals for offline development or when Hacker News API is down
FALLBACK_HN_SIGNALS = [
    {
        "source": "Hacker News (Ask HN)",
        "text": "Ask HN: What is the most frustrating part of your daily software workflow? Many developers complained about the complexity of managing and rotating API secrets across multiple AWS and GCP environments safely. Current solutions are either manual or enterprise-bloated.",
        "url": "https://news.ycombinator.com/item?id=placeholderhn1",
        "upvotes": 124,
        "timestamp": datetime.utcnow().isoformat()
    },
    {
        "source": "Hacker News (Ask HN)",
        "text": "Ask HN: What is a small tool you would pay $10/month for? A lot of remote freelancers upvoted a request for a clean, automatic screenshot-to-clean-text translator that handles multi-line code fragments and formats them with markdown syntax. Current OCR extensions fail on brackets/indentation.",
        "url": "https://news.ycombinator.com/item?id=placeholderhn2",
        "upvotes": 89,
        "timestamp": datetime.utcnow().isoformat()
    }
]

class HackerNewsTool:
    async def fetch(self) -> list[dict]:
        """Fetches trending Ask HN threads from the HN Algolia API or returns fallback signals."""
        signals = []
        # Search Ask HN stories in the past 7 days with points > 30
        url = "https://hn.algolia.com/api/v1/search?tags=ask_hn&numericFilters=created_at_i%3E%3D0,points%3E30&hitsPerPage=5"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    hits = response.json().get("hits", [])
                    for hit in hits:
                        text = hit.get("story_text") or ""
                        title = hit.get("title") or ""
                        full_text = f"{title}\n{text}"
                        
                        signals.append({
                            "source": "Hacker News (Ask HN)",
                            "text": full_text[:1000],
                            "url": f"https://news.ycombinator.com/item?id={hit.get('objectID')}",
                            "upvotes": hit.get("points", 0),
                            "timestamp": datetime.fromtimestamp(hit.get("created_at_i", datetime.utcnow().timestamp())).isoformat()
                        })
                else:
                    logger.warning(f"HN API returned status code {response.status_code}")
            except Exception as e:
                logger.warning(f"Failed to scrape Hacker News ({e}). Using fallback signals.")
                
        if not signals:
            logger.info("No live Hacker News signals fetched. Using local high-quality seed signals.")
            return FALLBACK_HN_SIGNALS
            
        return signals
