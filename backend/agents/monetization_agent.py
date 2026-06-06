import logging
import json
import httpx
from backend.config import settings

logger = logging.getLogger(__name__)

class MonetizationAgent:
    async def run(self, idea: dict) -> dict:
        """
        Runs monetization analysis on a generated idea card.
        Outputs pricing models, TAM/SAM/SOM estimates, competitors, and distribution strategy.
        """
        logger.info(f"Monetization Agent evaluating idea: {idea.get('problem')[:30]}...")
        
        report = await self._analyze_monetization(idea)
        report["idea_id"] = idea.get("id")
        return report

    async def _analyze_monetization(self, idea: dict) -> dict:
        prompt = f"""You are a startup VC and pricing analyst. Given the following Micro-SaaS idea:
Problem: {idea.get('problem')}
Target User: {idea.get('target_user')}
Solution: {idea.get('solution')}
Tech Stack: {", ".join(idea.get('stack', []))}

Perform a pricing and monetization analysis.
1. Estimate TAM/SAM/SOM market size (be realistic, explain reasoning in 1 sentence)
2. Recommend pricing model: freemium / subscription / one-time / usage-based
3. Recommend monthly price range in USD and INR (e.g. $19/mo, ₹1499/mo)
4. Identify 2-3 potential competitors
5. Assess willingness-to-pay (WTP) signal: strong / moderate / weak
6. Propose 3 marketing/distribution channels
7. Summarize the business viability in 2 sentences

Respond ONLY in JSON. No preamble. Use this schema:
{{
  "tam_estimate": "market size estimation description",
  "pricing_model": "subscription",
  "price_range_usd": "$29 - $79 / month",
  "price_range_inr": "₹2,499 - ₹6,499 / month",
  "competitors": ["competitor1", "competitor2"],
  "wtp_signal": "strong",
  "distribution": ["SEO", "Cold Outreach", "ProductHunt"],
  "summary": "business viability summary"
}}
"""
        # 1. Try Groq API
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

        # 2. Try Ollama local
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
                logger.warning(f"Ollama local call failed: {e}. Using fallback...")

        # 3. Rule-based mock fallback based on the stack and problem
        logger.info("Using rule-based fallback pricing report.")
        
        stack_str = "".join(idea.get("stack", [])).lower()
        problem_str = idea.get("problem", "").lower()
        
        # Deduce a reasonable pricing model
        pricing_model = "subscription"
        price_usd = "$19 - $49 / month"
        price_inr = "₹1,499 - ₹3,999 / month"
        competitors = ["Competitor A", "Competitor B"]
        wtp_signal = "moderate"
        distribution = ["ProductHunt Launch", "SEO", "Twitter/X Build in Public"]
        tam_estimate = "TAM is estimated at $150M globally, assuming 500,000 potential small business customers."
        summary = "Highly viable niche micro-SaaS. Low development overhead allows quick path to profitability with just 50 paying customers."
        
        if "copy" in problem_str or "marketing" in problem_str:
            pricing_model = "subscription"
            price_usd = "$29 - $79 / month"
            price_inr = "₹2,499 - ₹6,499 / month"
            competitors = ["Jasper.ai", "Copy.ai", "WriteSonic"]
            wtp_signal = "strong"
            distribution = ["Cold Email Outreach", "SEO Marketing", "Reddit & Indie Hackers Community"]
            tam_estimate = "TAM of $500M, driven by massive demand from content creators and solo entrepreneurs scaling marketing efforts."
            summary = "Strong viability. Marketing copy remains a persistent bottleneck; developers are highly willing to delegate copywriting tasks to AI."
            
        elif "boilerplate" in problem_str or "billing" in problem_str:
            pricing_model = "one-time"
            price_usd = "$99 - $199 one-time"
            price_inr = "₹7,999 - ₹15,999 one-time"
            competitors = ["ShipFast", "SaaS Pegasus", "Gravity"]
            wtp_signal = "strong"
            distribution = ["Twitter Build in Public", "GitHub Open-Source starter", "Developer Influencer Shoutouts"]
            tam_estimate = "TAM of $45M, targeting the active community of solo developers launching 2-3 projects annually."
            summary = "Very high viability for a developer audience. One-time payment models are popular among builders who dislike recurring boilerplate costs."
            
        elif "log" in problem_str or "observability" in problem_str:
            pricing_model = "usage-based"
            price_usd = "$15 - $99 / month"
            price_inr = "₹1,299 - ₹7,999 / month"
            competitors = ["Datadog", "LogSnag", "Grafana Cloud"]
            wtp_signal = "moderate"
            distribution = ["Hacker News discussion launch", "Developer Blog tutorials", "Self-hosted deploy buttons"]
            tam_estimate = "TAM of $2.5B, though the target market segment of bootstrapped developers represents a $60M addressable SOM."
            summary = "High viability. Devs hate high Datadog bills. A lightweight, simple solution can capture market share rapidly on price alone."
            
        elif "translate" in problem_str or "video" in problem_str:
            pricing_model = "usage-based"
            price_usd = "$49 - $149 / month"
            price_inr = "₹3,999 - ₹11,999 / month"
            competitors = ["ElevenLabs", "HeyGen", "Rask.ai"]
            wtp_signal = "strong"
            distribution = ["YouTube & TikTok ads", "AppSumo Deal Launch", "Content Creator Direct Sales"]
            tam_estimate = "TAM of $1.2B, driven by hyper-growth in international creator economy and localized digital marketing."
            summary = "Viable but requires solid infrastructure. AI video synthesis hosting costs are high, requiring a usage-based credits model."

        elif "form" in problem_str or "gdpr" in problem_str:
            pricing_model = "subscription"
            price_usd = "$25 - $89 / month"
            price_inr = "₹1,999 - ₹6,999 / month"
            competitors = ["Typeform", "Tally.so", "Jotform"]
            wtp_signal = "strong"
            distribution = ["GDPR Compliance Forums", "Indie Hackers newsletters", "Google Search Ads"]
            tam_estimate = "TAM of $800M, driven by strict data protection regulations globally forcing self-hosting migrations."
            summary = "High viability. Privacy compliance is a corporate mandate; companies gladly pay premium pricing for certified GDPR-safe form collection."
            
        return {
            "tam_estimate": tam_estimate,
            "pricing_model": pricing_model,
            "price_range_usd": price_usd,
            "price_range_inr": price_inr,
            "competitors": competitors,
            "wtp_signal": wtp_signal,
            "distribution": distribution,
            "summary": summary
        }
