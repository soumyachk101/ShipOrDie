import logging
import json
import re
import uuid
import httpx
from datetime import datetime
from backend.config import settings

logger = logging.getLogger(__name__)

# Pre-defined high-quality mock ideas matching the scraper trends for robust offline execution
MOCK_IDEAS = [
    {
        "keywords": ["copy", "marketing", "reddit", "email"],
        "problem": "Indie hackers and solo developers spend hours writing cold emails and marketing copy that sound generic and fail to convert.",
        "target_user": "Indie Hackers, Solo SaaS Founders, and Freelancers",
        "solution": "An AI-powered landing page and email copywriter tailored specifically to the tone, structure, and brevity preferred by technical audiences.",
        "stack": ["Next.js", "FastAPI", "OpenAI API", "Tailwind CSS"],
        "build_time_weeks": 2,
        "niche_score": 8.5
    },
    {
        "keywords": ["billing", "boilerplate", "launch", "fastapi"],
        "problem": "Setting up SaaS boilerplate components like stripe, auth, and database connections takes several days for every new micro-project.",
        "target_user": "SaaS Developers, Hackathon Participants, and Prototypers",
        "solution": "An ultra-minimalist, single-command Python/FastAPI boilerplate pre-configured with SQLite/Postgres, Stripe checkout, and simple JWT authentication.",
        "stack": ["FastAPI", "SQLAlchemy", "Stripe API", "Zustand"],
        "build_time_weeks": 1,
        "niche_score": 7.8
    },
    {
        "keywords": ["log", "datadog", "slack", "alert"],
        "problem": "Popular logging and observability platforms like Datadog are prohibitively expensive and overcomplicated for small startups.",
        "target_user": "Early Stage Startups, Self-Hosted Devs, and DevOps Teams",
        "solution": "A self-hosted, single-binary log parser that watches local system logs or Docker outputs and alerts Slack/Telegram on error spikes.",
        "stack": ["Go", "SQLite", "Docker", "Slack Webhooks"],
        "build_time_weeks": 3,
        "niche_score": 9.0
    },
    {
        "keywords": ["voice", "translate", "video", "lip"],
        "problem": "Translating and dubbing marketing videos into multiple languages is expensive and breaks speaker voice consistency and lip synchronization.",
        "target_user": "Content Creators, Product Marketers, and E-learning Instructors",
        "solution": "A video translation platform that clones the speaker's original voice tone and performs AI-driven video lip sync in the target language.",
        "stack": ["Python", "PyTorch", "Next.js", "Cloudflare R2"],
        "build_time_weeks": 4,
        "niche_score": 8.2
    },
    {
        "keywords": ["form", "gdpr", "open-source", "comply"],
        "problem": "Standard form builders host user data on third-party servers, presenting GDPR compliance issues for privacy-conscious businesses.",
        "target_user": "Data Privacy Officers, Healthcare startups, and European SaaS founders",
        "solution": "A 100% self-hosted, open-source form builder that saves submissions directly to your own database with built-in PII encryption.",
        "stack": ["Next.js", "Node.js", "PostgreSQL", "Tailwind CSS"],
        "build_time_weeks": 2,
        "niche_score": 9.2
    }
]

class IdeaGenAgent:
    async def run(self, clusters: list[dict]) -> list[dict]:
        """
        Takes opportunity clusters as input, calls LLM to generate 
        structured IdeaCard records, or falls back to synthetic generation.
        """
        logger.info(f"IdeaGen Agent starting for {len(clusters)} clusters...")
        ideas = []
        
        for cluster in clusters:
            theme = cluster.get("theme", "Niche SaaS")
            signals_text = "\n".join([f"- {s['text']}" for s in cluster.get("signals", [])])
            
            idea_card = await self._generate_idea_card(theme, signals_text)
            idea_card["cluster_id"] = cluster.get("cluster_id")
            idea_card["generated_at"] = datetime.utcnow().isoformat()
            idea_card["id"] = str(uuid.uuid4())
            ideas.append(idea_card)
            
        logger.info(f"IdeaGen Agent completed. Generated {len(ideas)} ideas.")
        return ideas

    async def _generate_idea_card(self, theme: str, signals_text: str) -> dict:
        """Helper to invoke LLM or use smart fallback rules."""
        prompt = f"""You are a Micro-SaaS product strategist. Given the following market signals:
{signals_text}

Generate a structured Micro-SaaS idea with:
1. Problem statement (1 sentence)
2. Target user (specific, not generic)
3. Proposed solution (2 sentences max)
4. Suggested tech stack (3-4 technologies)
5. Estimated solo build time (weeks, integer)
6. Niche score: 1.0-10.0 (10 = hyper-niche, underserved)

Respond ONLY in JSON. No preamble. Use this schema:
{{
  "problem": "problem statement",
  "target_user": "target user",
  "solution": "solution description",
  "stack": ["tech1", "tech2", "tech3"],
  "build_time_weeks": 3,
  "niche_score": 8.5
}}
"""
        # 1. Try Groq API first if key is present
        if settings.GROQ_API_KEY and settings.GROQ_API_KEY != "groq_api_key_placeholder":
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    headers = {
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    }
                    data = {
                        "model": "llama3-8b-8192",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.2,
                        "response_format": {"type": "json_object"}
                    }
                    response = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=data)
                    if response.status_code == 200:
                        content = response.json()["choices"][0]["message"]["content"]
                        return json.loads(content)
            except Exception as e:
                logger.warning(f"Groq API call failed: {e}. Trying Ollama...")

        # 2. Try Ollama local model if base url is active
        if settings.OLLAMA_BASE_URL:
            try:
                async with httpx.AsyncClient(timeout=20.0) as client:
                    url = f"{settings.OLLAMA_BASE_URL}/api/chat"
                    data = {
                        "model": "llama3.2",
                        "messages": [{"role": "user", "content": prompt}],
                        "stream": False,
                        "format": "json"
                    }
                    response = await client.post(url, json=data)
                    if response.status_code == 200:
                        content = response.json()["message"]["content"]
                        return json.loads(content)
            except Exception as e:
                logger.warning(f"Ollama local call failed: {e}. Using rule-based fallback...")

        # 3. Rule-based mock fallback
        logger.info(f"Using rule-based synthetic generator for cluster: {theme}")
        theme_lower = theme.lower()
        
        # Match keywords in theme to our pre-defined high quality ideas
        matched_idea = None
        for idea in MOCK_IDEAS:
            if any(kw in theme_lower for kw in idea["keywords"]):
                matched_idea = idea
                break
                
        # If no direct match, return a clean dynamically constructed idea card
        if not matched_idea:
            matched_idea = {
                "problem": f"Existing solutions for {theme} are either too expensive or lack key customization options required by users.",
                "target_user": f"Professionals and teams handling {theme} workflows",
                "solution": f"A lightweight, focused web application that automates {theme} with clean APIs and simple UI dashboards.",
                "stack": ["Next.js", "FastAPI", "SQLite"],
                "build_time_weeks": 3,
                "niche_score": 8.0
            }
            
        return {
            "problem": matched_idea["problem"],
            "target_user": matched_idea["target_user"],
            "solution": matched_idea["solution"],
            "stack": matched_idea["stack"],
            "build_time_weeks": matched_idea["build_time_weeks"],
            "niche_score": matched_idea["niche_score"]
        }
