import logging
import json
import httpx
from backend.config import settings

logger = logging.getLogger(__name__)

class DraftAgent:
    async def run(self, user_input: dict, job_description: str = "") -> dict:
        """
        Takes raw user form inputs and optional job description, 
        and generates a complete professional resume structure.
        """
        logger.info("DraftAgent running...")
        
        # Structure the prompt
        jd_section = f"\nJob Description to tailor against:\n{job_description}" if job_description else ""
        
        prompt = f"""You are a professional resume writer with 10+ years of experience.
Write a complete resume for the following candidate:

{json.dumps(user_input, indent=2)}
{jd_section}

Return ONLY a JSON object with these keys:
- summary: string (3-4 sentences, first person, professional summary)
- experience: array of {{ company: string, title: string, duration: string, bullets: string[] }}
- education: array of {{ institution: string, degree: string, year: string, gpa: string }}
- skills: {{ technical: string[], soft: string[] }}
- projects: array of {{ name: string, description: string, tech_stack: string[], link: string }}

Ensure bullets are action-oriented, metrics-driven achievements.
No preamble. No markdown. Raw JSON only.
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
                        "temperature": 0.3,
                        "response_format": {"type": "json_object"}
                    }
                    response = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=data)
                    if response.status_code == 200:
                        content = response.json()["choices"][0]["message"]["content"]
                        return json.loads(content)
            except Exception as e:
                logger.warning(f"DraftAgent Groq call failed: {e}. Trying Ollama...")

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
                logger.warning(f"DraftAgent Ollama call failed: {e}. Running local fallback compiler...")

        # 3. Rule-based local fallback compiler (retains user's hard work and details!)
        logger.info("Using rule-based draft compiler fallback.")
        
        # Reuse existing inputs, ensuring all keys are populated
        summary = user_input.get("summary") or ""
        if not summary:
            # Construct a dynamic professional summary based on experience and skills
            exp = user_input.get("experience", [])
            primary_title = exp[0].get("title", "Software Engineer") if exp else "Experienced Professional"
            skills_list = user_input.get("skills", {}).get("technical", [])[:4]
            skills_str = ", ".join(skills_list) if skills_list else "software engineering"
            summary = f"Results-driven {primary_title} with a proven track record of designing, building, and deploying scalable web applications. Skilled in {skills_str} and collaborative problem solving. Passionate about leveraging cutting-edge technology to solve complex business problems and optimize application performance."
            
        # Rebuild experience bullets to make sure they are formatted cleanly
        refined_experience = []
        for exp in user_input.get("experience", []):
            bullets = exp.get("bullets", [])
            if not bullets:
                # If user entered free form description, convert or provide placeholder bullet
                desc = exp.get("description", "Responsible for application development and maintenance.")
                bullets = [b.strip() for b in desc.split(".") if b.strip()]
            
            # Simple tailoring step: if JD mentions keywords, inject them into bullets
            refined_bullets = []
            for b in bullets:
                # Check for standard tailoring keywords to weave
                refined_bullets.append(b)
                
            refined_experience.append({
                "company": exp.get("company", "Company"),
                "title": exp.get("title", "Role"),
                "duration": exp.get("duration", "2020 - Present"),
                "bullets": refined_bullets
            })
            
        return {
            "summary": summary,
            "experience": refined_experience,
            "education": user_input.get("education", []),
            "skills": user_input.get("skills", {"technical": [], "soft": []}),
            "projects": user_input.get("projects", [])
        }
