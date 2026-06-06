import re
import logging
import json
import httpx
from backend.config import settings

logger = logging.getLogger(__name__)

# List of common tech terms to identify as keywords in JDs
TECH_DICTIONARY = [
    "react", "vue", "angular", "node", "express", "fastapi", "django", "flask", "spring",
    "python", "javascript", "typescript", "golang", "rust", "java", "c++", "ruby", "php",
    "postgresql", "mongodb", "mysql", "redis", "cassandra", "sqlite", "oracle", "mariadb",
    "docker", "kubernetes", "aws", "gcp", "azure", "jenkins", "terraform", "ansible",
    "graphql", "rest", "grpc", "html", "css", "tailwind", "sass", "bootstrap", "webpack",
    "git", "ci/cd", "agile", "scrum", "microservices", "serverless", "devops", "mlops"
]

class ATSAgent:
    async def run(self, resume_data: dict, job_description: str = "") -> dict:
        """
        Runs ATS optimization on humanized resume JSON.
        Normalizes headings, removes invalid symbols, and injects keywords from the JD.
        """
        logger.info("ATSAgent running...")
        
        # 1. Clean special characters from text fields
        optimized = self._clean_characters(resume_data)
        
        # 2. Normalize section headings in keys/titles
        # The JSON structure keys are predefined, but we verify sub-fields and titles.
        
        # 3. Extract keywords from Job Description
        keywords = self._extract_keywords(job_description)
        logger.info(f"Extracted job keywords: {keywords}")
        
        # 4. Integrate keywords into resume details
        if keywords:
            optimized = await self._inject_keywords_llm_or_local(optimized, keywords)
            
        return optimized

    def _clean_characters(self, data: dict) -> dict:
        """Strips symbols like ★, ●, ◆, →, ✓ from text fields as they break ATS parsers."""
        pattern = re.compile(r"[★●◆■▲▼✓✔✕✖✗✘•▪▪▫◦○●◎⊙◘◙✓✔☑✓✏✒✏✑✒➩➪➫➬➭➮➯➔➘➙➚➛➜➝➞➟➡➢➣➤➥➦➧➨➩➫➬➭➮➯➱➲➳➴➵➶➷➸➹➻➼➽➾]")
        
        def clean_nested(obj):
            if isinstance(obj, str):
                # Replace bullet symbols with simple dash or space
                cleaned = pattern.sub("", obj)
                # Normalize double spaces
                return re.sub(r"\s+", " ", cleaned).strip()
            elif isinstance(obj, list):
                return [clean_nested(item) for item in obj]
            elif isinstance(obj, dict):
                return {k: clean_nested(v) for k, v in obj.items()}
            return obj
            
        return clean_nested(data)

    def _extract_keywords(self, jd: str) -> list[str]:
        """Extracts top technical terms and key skill nouns from JD."""
        if not jd:
            return []
            
        jd_lower = jd.lower()
        found = []
        for word in TECH_DICTIONARY:
            # Match word boundary
            if re.search(rf"\b{word}\b", jd_lower):
                # Standardize capitalization based on dict entry
                found.append(word.title() if word not in ["aws", "gcp", "ci/cd", "html", "css", "rest", "grpc", "api", "xml", "json", "sql"] else word.upper())
                
        # Return unique keywords, up to 10
        return list(set(found))[:10]

    async def _inject_keywords_llm_or_local(self, resume_data: dict, keywords: list[str]) -> dict:
        """Weaves matching skills into technical skills category and experience bullets."""
        # Check which keywords are already present in the resume
        flat_text = json.dumps(resume_data).lower()
        missing_keywords = [kw for kw in keywords if kw.lower() not in flat_text]
        
        if not missing_keywords:
            return resume_data
            
        # Try to weave using LLM if keys are available
        prompt = f"""You are optimizing a resume for ATS systems. 
Your task is to weave the following keywords into the resume naturally, WITHOUT lying or changing the candidate's core roles.
Keywords to inject: {", ".join(missing_keywords)}

Resume:
{json.dumps(resume_data, indent=2)}

Rules:
1. Inject these missing terms naturally into relevant work experience bullets or the technical skills list.
2. Maintain standard section headers.
3. Keep the resume human-sounding. Do not use forbidden buzzwords.
4. Keep the exact same JSON format.

Return ONLY optimized JSON. No preamble.
"""
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
                        "temperature": 0.2,
                        "response_format": {"type": "json_object"}
                    }
                    response = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=data)
                    if response.status_code == 200:
                        content = response.json()["choices"][0]["message"]["content"]
                        return json.loads(content)
            except Exception as e:
                logger.warning(f"ATSAgent Groq weave failed: {e}. Trying Ollama...")

        # 2. Try Ollama local
        if settings.OLLAMA_BASE_URL:
            try:
                async with httpx.AsyncClient(timeout=25.0) as client:
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
                logger.warning(f"ATSAgent Ollama weave failed: {e}. Using programmatic weave...")

        # 3. Rule-based local weave
        # Append missing keywords directly to the technical skills list (this is extremely safe and ATS effective!)
        logger.info("Using local rule-based programmatic keyword weave.")
        optimized = resume_data.copy()
        skills = optimized.get("skills", {})
        if not isinstance(skills, dict):
            skills = {"technical": [], "soft": []}
            
        tech_skills = skills.get("technical", [])
        if not isinstance(tech_skills, list):
            tech_skills = []
            
        # Add keywords to technical skills if not already there
        added = 0
        for kw in missing_keywords:
            if kw.lower() not in [ts.lower() for ts in tech_skills]:
                tech_skills.append(kw)
                added += 1
                
        skills["technical"] = tech_skills
        optimized["skills"] = skills
        logger.info(f"Programmatically added {added} keywords to candidate technical skills list.")
        return optimized
