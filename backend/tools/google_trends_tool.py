import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Fallback/mock signals for Google Trends queries
FALLBACK_TRENDS_SIGNALS = [
    {
        "source": "Google Trends",
        "text": "Rising queries: 'self-hosted form builder', 'gdpr open-source forms'. Analysis: 300% search volume spike over the last 15 days indicates demand for compliant custom form creation tools.",
        "url": "https://trends.google.com",
        "upvotes": 50,
        "timestamp": datetime.utcnow().isoformat()
    },
    {
        "source": "Google Trends",
        "text": "Rising queries: 'AI voice translations video', 'lip sync video AI'. Analysis: 180% surge shows high demand for media localization platforms.",
        "url": "https://trends.google.com",
        "upvotes": 40,
        "timestamp": datetime.utcnow().isoformat()
    }
]

class GoogleTrendsTool:
    async def fetch(self) -> list[dict]:
        """Fetches rising terms from Google Trends or returns mock signals."""
        logger.info("Google Trends API fetching. Defaulting to fallback trend signals.")
        return FALLBACK_TRENDS_SIGNALS
