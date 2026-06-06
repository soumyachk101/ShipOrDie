import logging
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)

# Fallback/mock signals for offline development or when ProductHunt GraphQL API is unavailable
FALLBACK_PH_SIGNALS = [
    {
        "source": "ProductHunt",
        "text": "LingoBite: AI-powered localized marketing voiceover generator. Translates videos into 15 languages, adjusting mouth movements and preserving speaker tone. Upvoted as #1 Product of the Day.",
        "url": "https://www.producthunt.com/posts/lingobite",
        "upvotes": 412,
        "timestamp": datetime.utcnow().isoformat()
    },
    {
        "source": "ProductHunt",
        "text": "TaskFlow: Privacy-first project management board that works 100% locally using local storage and synced peer-to-peer. No cloud databases, completely GDPR compliant out-of-the-box.",
        "url": "https://www.producthunt.com/posts/taskflow",
        "upvotes": 289,
        "timestamp": datetime.utcnow().isoformat()
    }
]

class ProductHuntTool:
    async def fetch(self) -> list[dict]:
        """Fetches trending products from ProductHunt or returns high-quality fallback signals."""
        # ProductHunt requires GraphQL token. As it is an MVP, we default to fallback list
        # but allow future expansion here.
        logger.info("ProductHunt API fetching. Defaulting to fallback/mock trends for seed signals.")
        return FALLBACK_PH_SIGNALS
