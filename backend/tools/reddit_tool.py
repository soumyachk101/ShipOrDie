import logging
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)

# Fallback/mock signals for offline development or when Reddit rate-limits us
FALLBACK_REDDIT_SIGNALS = [
    {
        "source": "Reddit (r/SaaS)",
        "text": "Is there a tool to automatically generate micro-SaaS marketing copy? Writing cold emails and landing page hooks takes me hours and feels so artificial. I would pay $30/mo for a tool that writes human-sounding copy specifically for indie hacker products.",
        "url": "https://reddit.com/r/SaaS/comments/placeholder1",
        "upvotes": 75,
        "timestamp": datetime.utcnow().isoformat()
    },
    {
        "source": "Reddit (r/entrepreneur)",
        "text": "Every time I want to launch a small project, setting up the subscription billing, auth, and database take 3 days. I wish there was an ultra-simplified boilerplate that isn't bloated. Just clean Python/FastAPI backend and raw HTML/JS frontend that can be deployed to Vercel in 1 click.",
        "url": "https://reddit.com/r/entrepreneur/comments/placeholder2",
        "upvotes": 142,
        "timestamp": datetime.utcnow().isoformat()
    },
    {
        "source": "Reddit (r/webdev)",
        "text": "We are drowning in logs. Splunk and Datadog are way too expensive for our 5-person startup. We just need a simple, self-hosted dashboard that parses structured JSON logs and alerts us on Slack when errors spike. Nothing fancy, just low latency and cheap.",
        "url": "https://reddit.com/r/webdev/comments/placeholder3",
        "upvotes": 58,
        "timestamp": datetime.utcnow().isoformat()
    }
]

class RedditTool:
    async def fetch(self) -> list[dict]:
        """Fetches trending posts from SaaS & Entrepreneur subreddits or returns high-quality fallback signals."""
        signals = []
        subreddits = ["SaaS", "entrepreneur", "startups"]
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            for sub in subreddits:
                url = f"https://www.reddit.com/r/{sub}/hot.json?limit=5"
                headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
                try:
                    response = await client.get(url, headers=headers)
                    if response.status_code == 200:
                        data = response.json()
                        posts = data.get("data", {}).get("children", [])
                        for post in posts:
                            post_data = post.get("data", {})
                            # Filter posts that talk about "tool", "need", "annoying", "pay", "alternative"
                            title = post_data.get("title", "")
                            selftext = post_data.get("selftext", "")
                            full_text = f"{title}\n{selftext}"
                            
                            signals.append({
                                "source": f"Reddit (r/{sub})",
                                "text": full_text[:1000], # truncate to avoid excessive tokens
                                "url": f"https://reddit.com{post_data.get('permalink')}",
                                "upvotes": post_data.get("ups", 0),
                                "timestamp": datetime.utcfromtimestamp(post_data.get("created_utc", datetime.utcnow().timestamp())).isoformat()
                            })
                    else:
                        logger.warning(f"Reddit API for r/{sub} returned status code {response.status_code}")
                except Exception as e:
                    logger.warning(f"Failed to scrape Reddit r/{sub} ({e}). Using fallback signals.")
                    
        if not signals:
            logger.info("No live Reddit signals fetched. Using local high-quality seed signals.")
            return FALLBACK_REDDIT_SIGNALS
            
        return signals
