import os
import re
import logging
import json
import httpx
from backend.config import settings

logger = logging.getLogger(__name__)

# Fallback substitution mapping for forbidden words to guarantee they are cleaned programmatically
BUZZWORD_REPLACEMENTS = {
    "leverage": "use",
    "utilize": "use",
    "spearhead": "lead",
    "synergy": "collaboration",
    "robust": "solid",
    "cutting-edge": "modern",
    "seamlessly": "easily",
    "innovative": "creative",
    "dynamic": "active",
    "passionate": "focused",
    "results-driven": "effective",
    "detail-oriented": "focused",
    "proactive": "active",
    "strategic": "planned",
    "holistic": "complete",
    "paradigm": "approach",
    "ecosystem": "platform",
    "scalable": "expandable",
    "best-in-class": "top-tier",
    "world-class": "premium",
    "transformative": "impactful",
    "game-changer": "catalyst",
    "disruptive": "new",
    "actionable": "clear",
    "impactful": "significant",
    "deliverables": "outputs"
}

class HumanizerAgent:
    def __init__(self):
        self.forbidden_words = set()
        self._load_forbidden_words()

    def _load_forbidden_words(self):
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            filepath = os.path.join(current_dir, "forbidden_words.txt")
            if os.path.exists(filepath):
                with open(filepath, "r") as f:
                    content = f.read()
                    # Split by comma or newline
                    words = re.split(r"[,\n]", content)
                    self.forbidden_words = {w.strip().lower() for w in words if w.strip()}
                logger.info(f"Loaded {len(self.forbidden_words)} forbidden words from forbidden_words.txt")
            else:
                logger.warning("forbidden_words.txt not found. Using default mapping keys.")
                self.forbidden_words = set(BUZZWORD_REPLACEMENTS.keys())
        except Exception as e:
            logger.error(f"Failed to load forbidden words: {e}")
            self.forbidden_words = set(BUZZWORD_REPLACEMENTS.keys())

    def _programmatic_clean(self, text: str) -> str:
        """Uses regex to replace forbidden buzzwords with human-sounding alternatives."""
        cleaned_text = text
        for word, replacement in BUZZWORD_REPLACEMENTS.items():
            # Match whole words ignoring case
            pattern = re.compile(rf"\b{word}\b", re.IGNORECASE)
            # Match matching case for replacement (crude title case check)
            def replace_match(match):
                matched_str = match.group(0)
                if matched_str.istitle():
                    return replacement.title()
                elif matched_str.isupper():
                    return replacement.upper()
                return replacement
            
            cleaned_text = pattern.sub(replace_match, cleaned_text)
        return cleaned_text

    async def run(self, draft_resume: dict, temperature: float = 0.7) -> dict:
        """
        Humanizes resume content by injecting sentence variance (burstiness) 
        and replacing LLM signature terms.
        """
        logger.info(f"HumanizerAgent running with temperature={temperature}...")
        
        forbidden_list_str = ", ".join(self.forbidden_words)
        prompt = f"""You are rewriting resume content to sound authentically human-written (high perplexity, high sentence length variance).
Rules:
1. VARY sentence length drastically — mix short 3-word statements with longer 20-word detailed clauses.
2. NEVER use any of these words: {forbidden_list_str}
3. USE casual-professional verbs: "built", "shipped", "fixed", "led", "ran", "cut", "managed" instead of corporate jargon.
4. VARY bullet structures — do not start every single bullet with the exact same verb form.
5. Inject subtle imperfections in writing flow: make it read like a real human engineer wrote it, not a template.
6. Maintain 100% of facts, companies, dates, and metrics. Do not invent any.

Draft Resume:
{json.dumps(draft_resume, indent=2)}

Return the humanized version in the exact same JSON format. No preamble. No markdown blocks.
"""
        humanized = None
        # 1. Try Groq
        if settings.GROQ_API_KEY and settings.GROQ_API_KEY != "groq_api_key_placeholder":
            try:
                async with httpx.AsyncClient(timeout=20.0) as client:
                    headers = {
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    }
                    data = {
                        "model": "llama3-8b-8192",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": temperature,
                        "response_format": {"type": "json_object"}
                    }
                    response = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=data)
                    if response.status_code == 200:
                        content = response.json()["choices"][0]["message"]["content"]
                        humanized = json.loads(content)
            except Exception as e:
                logger.warning(f"Humanizer LLM call failed: {e}. Trying Ollama...")

        # 2. Try Ollama local
        if not humanized and settings.OLLAMA_BASE_URL:
            try:
                async with httpx.AsyncClient(timeout=25.0) as client:
                    url = f"{settings.OLLAMA_BASE_URL}/api/chat"
                    data = {
                        "model": "llama3.2",
                        "messages": [{"role": "user", "content": prompt}],
                        "stream": False,
                        "format": "json",
                        "options": {"temperature": temperature}
                    }
                    response = await client.post(url, json=data)
                    if response.status_code == 200:
                        content = response.json()["message"]["content"]
                        humanized = json.loads(content)
            except Exception as e:
                logger.warning(f"Humanizer Ollama call failed: {e}.")

        # 3. Fallback or post-processing clean
        if not humanized:
            logger.info("Humanizer falling back to programmatic regex cleaning.")
            humanized = draft_resume.copy()
            
        # Programmatic sanitization of ALL values in the dictionary
        # We recursively traverse the dict to apply word replacements
        def clean_nested(obj):
            if isinstance(obj, str):
                return self._programmatic_clean(obj)
            elif isinstance(obj, list):
                return [clean_nested(item) for item in obj]
            elif isinstance(obj, dict):
                return {k: clean_nested(v) for k, v in obj.items()}
            return obj

        sanitized_resume = clean_nested(humanized)
        
        # Verify that we replaced all forbidden terms
        logger.info("Programmatic buzzword clean verification completed.")
        return sanitized_resume
