# ShipOrDie — Technical Requirements Document (TRD)

> **Version:** 2.0  
> **Author:** Soumya Chakraborty  
> **Stack:** Next.js + FastAPI + CrewAI/LangGraph + ChromaDB + PostgreSQL + Redis  
> **Updated:** Resume Builder module added — Anti-AI-Detection Engine, Template System, Export Pipeline  

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│     Dashboard / Auth / Idea Cards / Resume Builder / Export      │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST / WebSocket
┌────────────────────────▼────────────────────────────────────────┐
│                     Backend API (FastAPI)                         │
│         Auth, Credits, Job Queue, Idea Store, Resume Store       │
└──────┬──────────────┬──────────────────┬──────────────┬─────────┘
       │              │                  │              │
┌──────▼──────┐ ┌─────▼──────┐  ┌───────▼──────┐ ┌────▼──────────┐
│  Idea Agent │ │ PostgreSQL  │  │    Redis      │ │ Resume        │
│  Pipeline   │ │  (Primary   │  │  (Job Queue   │ │ Pipeline      │
│ (LangGraph) │ │    DB)      │  │   + Cache)    │ │ (LangGraph)   │
└──────┬──────┘ └─────────────┘  └──────────────┘ └────┬──────────┘
       │                                                │
┌──────▼──────────────────────┐   ┌────────────────────▼──────────┐
│      Idea Agent Layer        │   │     Resume Agent Layer         │
│  Scraper → Synthesizer RAG  │   │  Draft → Humanizer → ATS      │
│  → Idea Gen → Monetization  │   │  Optimizer → Score Checker    │
└──────┬──────────────────────┘   └────────────────────┬──────────┘
       │                                                │
┌──────▼──────────────────────┐   ┌────────────────────▼──────────┐
│     ChromaDB / Pinecone      │   │    Cloudflare R2               │
│     (Vector Store)           │   │    (PDF / DOCX exports)        │
└──────────────────────────────┘   └────────────────────────────────┘
```

---

## 2. Tech Stack

### 2.1 Frontend

| Layer | Tech | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR, file-based routing, fast |
| Styling | Tailwind CSS + shadcn/ui | Rapid UI, accessible components |
| State | Zustand | Lightweight, no boilerplate |
| Auth | NextAuth.js (Google + GitHub) | Easy OAuth, session management |
| HTTP Client | Axios + React Query | Caching, background refetch |
| Export | react-pdf / jsPDF | Client-side PDF generation |

### 2.2 Backend

| Layer | Tech | Reason |
|---|---|---|
| API Framework | FastAPI | Async, fast, Python ecosystem |
| Agent Orchestration | CrewAI + LangGraph | Multi-agent workflow, state machines |
| LLM | Ollama (local) + Groq API (fallback) | Free tier, speed |
| Embeddings | `nomic-embed-text` (Ollama) | Local, no cost |
| Vector DB | ChromaDB (local) / Pinecone (prod) | Easy dev→prod migration |
| Primary DB | PostgreSQL (via SQLAlchemy + Alembic) | Relational, reliable |
| Cache / Queue | Redis + Celery | Background jobs, rate limiting |
| Scraping | Playwright + BeautifulSoup4 | JS-rendered pages support |

### 2.3 Infrastructure

| Layer | Tech |
|---|---|
| Containerization | Docker + Docker Compose |
| Deployment | Railway (backend) + Vercel (frontend) |
| Object Storage | Cloudflare R2 (PDF exports) |
| Payments | Razorpay (primary) + Stripe (secondary) |
| Monitoring | Sentry (errors) + Posthog (analytics) |

---

## 3. Agent Pipeline — Detailed Design

### 3.1 Agent 1: Trend Scraper Agent

**Input:** Trigger (scheduled / on-demand)  
**Output:** Raw signal list `[{source, text, url, upvotes, timestamp}]`

**Sources:**
- Reddit: r/SaaS, r/entrepreneur, r/webdev, r/startups — top posts last 7 days
- ProductHunt: Top launches this week
- Hacker News: "Ask HN" threads with >50 points
- Google Trends: Rising queries in "software", "tools", "automation" categories

**Implementation:**
```python
class ScraperAgent:
    tools = [RedditTool, ProductHuntTool, HNTool, GoogleTrendsTool]
    
    async def run(self) -> List[Signal]:
        signals = []
        for tool in self.tools:
            raw = await tool.fetch()
            signals.extend(self.normalize(raw))
        return self.deduplicate(signals)
```

**Rate Limiting:**
- Reddit API: 60 requests/minute (OAuth2)
- Playwright scrapers: 1 request/3 seconds, randomized user-agent
- Run cycle: every 6 hours via Celery Beat

---

### 3.2 Agent 2: Synthesizer RAG Agent

**Input:** Raw signals list  
**Output:** Opportunity clusters `[{cluster_id, theme, signals[], embedding}]`

**Flow:**
1. Chunk each signal into 256-token segments
2. Embed using `nomic-embed-text`
3. Upsert into ChromaDB collection `signals`
4. Retrieve top-K (K=20) semantically similar signals per query theme
5. Cluster using HDBSCAN or simple cosine similarity grouping
6. Return clusters with dominant theme label

**Deduplication:**
- If cosine similarity > 0.85 between two clusters → merge
- Keep cluster with highest total signal count

**Schema in ChromaDB:**
```python
collection.add(
    documents=[signal.text],
    metadatas=[{"source": signal.source, "timestamp": signal.ts, "upvotes": signal.upvotes}],
    ids=[signal.id]
)
```

---

### 3.3 Agent 3: Idea Generation Agent

**Input:** Opportunity clusters  
**Output:** Idea cards `[IdeaCard]`

**Prompt Template:**
```
You are a Micro-SaaS product strategist. Given the following market signals:

{cluster_signals}

Generate a structured Micro-SaaS idea with:
1. Problem statement (1 sentence)
2. Target user (specific, not generic)
3. Proposed solution (2 sentences max)
4. Suggested tech stack (3-4 technologies)
5. Estimated solo build time (weeks)
6. Niche score: 1-10 (10 = hyper-niche, underserved)

Respond ONLY in JSON. No preamble.
```

**Output Schema:**
```typescript
interface IdeaCard {
  id: string;
  problem: string;
  target_user: string;
  solution: string;
  stack: string[];
  build_time_weeks: number;
  niche_score: number;
  cluster_id: string;
  generated_at: string;
}
```

---

### 3.4 Agent 4: VC / Monetization Agent

**Input:** IdeaCard  
**Output:** MonetizationReport

**Evaluates:**
- TAM/SAM/SOM estimation (LLM-reasoned, not scraped)
- Pricing model recommendation (freemium / subscription / one-time / usage-based)
- Competitor names (if any, from knowledge base)
- Willingness to pay signal (extracted from original Reddit/HN upvotes and comments)
- Suggested price range (in USD and INR)
- Distribution channels (SEO, cold outreach, ProductHunt launch, etc.)

**Output Schema:**
```typescript
interface MonetizationReport {
  idea_id: string;
  tam_estimate: string;
  pricing_model: "freemium" | "subscription" | "one-time" | "usage-based";
  price_range: { usd: string; inr: string };
  competitors: string[];
  wtp_signal: "strong" | "moderate" | "weak";
  distribution: string[];
  summary: string;
}
```

---

## 4. Resume Builder Pipeline — Detailed Design

### 4.1 Overview

The Resume Builder uses a 4-pass LangGraph pipeline to generate resumes that score below 10% on AI detectors.

```
UserInput → Pass1:Draft → Pass2:Humanize → Pass3:ScoreCheck → Pass4:ATS → Output
```

### 4.2 Pipeline State

```python
# backend/pipeline/resume_state.py
from typing import TypedDict, Optional

class ResumePipelineState(TypedDict):
    job_id: str
    user_id: str
    user_input: dict          # raw form data
    job_description: str      # optional JD paste
    template: str             # 'classic_ats' | 'modern_split' | 'tech_minimal' | 'creative_edge'
    draft_resume: str         # Pass 1 output
    humanized_resume: str     # Pass 2 output
    ai_score: float           # Pass 3 output (0.0–1.0, lower = more human)
    ats_score: float          # Pass 4 output
    final_resume: dict        # structured final output
    pass2_attempts: int       # retry counter
    status: str
    error: Optional[str]
```

### 4.3 Pass 1 — Draft Generation Agent

**Input:** User form data + optional JD  
**Output:** Raw structured resume text

**Prompt strategy:**
- Generate a complete, professional resume from user inputs
- If JD provided: extract top 10 keywords and weave them naturally into bullets
- Output as structured JSON (sections: summary, experience, education, skills, projects)

```python
DRAFT_PROMPT = """
You are a professional resume writer with 10+ years of experience.
Write a complete resume for the following candidate:

{user_input}

{jd_section}

Return ONLY a JSON object with these keys:
- summary: string (3-4 sentences, first person, professional)
- experience: array of {{ company, title, duration, bullets: string[] }}
- education: array of {{ institution, degree, year, gpa? }}
- skills: {{ technical: string[], soft: string[] }}
- projects: array of {{ name, description, tech_stack: string[], link? }}

No preamble. No markdown. Raw JSON only.
"""
```

### 4.4 Pass 2 — Humanization Agent

**Input:** Draft resume JSON  
**Output:** Humanized resume text

**Core technique — Burstiness + Perplexity injection:**

Human writing has high "burstiness" (mix of short and long sentences) and high "perplexity" (unpredictable word choices). LLM writing is uniform — same sentence length, same predictable vocabulary.

```python
HUMANIZE_PROMPT = """
You are rewriting resume content to sound authentically human-written.

Rules:
1. VARY sentence length drastically — mix 3-word punchy lines with 20-word detailed ones
2. NEVER use these words: leverage, utilize, spearhead, synergy, robust, cutting-edge, 
   seamlessly, innovative, dynamic, passionate, results-driven, detail-oriented
3. USE casual-professional phrasing: "built", "shipped", "fixed", "helped", "ran", "cut"
4. VARY bullet structure — not every bullet starts with a verb
5. Add ONE subtle imperfection per section (a slightly unusual word choice, minor restructuring)
6. Maintain factual accuracy — never add or remove achievements

Input resume:
{draft_resume}

Return the humanized version in the same JSON structure. No preamble.
"""
```

**Forbidden LLM signature words list** (stored in `backend/agents/resume/forbidden_words.txt`):
```
leverage, utilize, spearhead, synergy, robust, cutting-edge, seamlessly,
innovative, dynamic, passionate, results-driven, detail-oriented, proactive,
strategic, holistic, paradigm, ecosystem, scalable, best-in-class, world-class,
transformative, game-changer, disruptive, actionable, impactful, deliverables
```

### 4.5 Pass 3 — AI Score Checker

**Input:** Humanized resume text  
**Output:** AI detection score (0.0–1.0) + retry decision

**Internal scoring model** (no external API calls — avoids cost and rate limits):

```python
class AIScoreChecker:
    """
    Approximates GPTZero's perplexity + burstiness scoring.
    Uses a lightweight local model or heuristic-based approach.
    """
    
    def score(self, text: str) -> float:
        perplexity = self._calculate_perplexity(text)
        burstiness = self._calculate_burstiness(text)
        forbidden_density = self._check_forbidden_words(text)
        
        # Weighted composite score (lower = more human)
        score = (
            0.4 * (1 - self._normalize_perplexity(perplexity)) +
            0.4 * (1 - self._normalize_burstiness(burstiness)) +
            0.2 * forbidden_density
        )
        return round(score, 3)
    
    def _calculate_burstiness(self, text: str) -> float:
        """Variance in sentence length. High variance = human-like."""
        sentences = sent_tokenize(text)
        lengths = [len(s.split()) for s in sentences]
        return statistics.stdev(lengths) if len(lengths) > 1 else 0
    
    def _check_forbidden_words(self, text: str) -> float:
        """Density of LLM-signature words. Lower = more human."""
        words = text.lower().split()
        hits = sum(1 for w in words if w in FORBIDDEN_WORDS)
        return hits / len(words)
```

**Retry logic:**
- If `score > 0.30` → re-run Pass 2 with `temperature += 0.1` and stricter forbidden word enforcement
- Max 3 retries → return best scoring version

### 4.6 Pass 4 — ATS Optimization Agent

**Input:** Humanized resume JSON + optional JD  
**Output:** ATS-optimized final resume

**ATS rules enforced:**
- Section headings: exactly "Experience", "Education", "Skills", "Projects", "Summary"
- No tables, no columns, no text boxes, no special Unicode characters
- No headers/footers in DOCX output
- Font: single font family only (Arial or Calibri)
- If JD provided: verify top 10 JD keywords appear naturally in resume
- Inject missing keywords into relevant bullets without sounding forced

```python
ATS_PROMPT = """
Review and optimize this resume for ATS systems.

Resume: {humanized_resume}
Job Description Keywords: {top_keywords}

Rules:
1. Section headings must be exactly: Summary, Experience, Education, Skills, Projects
2. Remove any special characters: ★ ● ◆ → ✓ and similar
3. Ensure these keywords appear naturally (don't force them): {top_keywords}
4. Keep all content human-sounding — do NOT re-introduce banned words

Return optimized JSON. No preamble.
"""
```

### 4.7 PDF/DOCX Renderer

**4 Templates implemented as Jinja2 HTML → WeasyPrint PDF:**

```python
# backend/services/resume_renderer.py

TEMPLATES = {
    "classic_ats": "templates/resume/classic_ats.html",
    "modern_split": "templates/resume/modern_split.html", 
    "tech_minimal": "templates/resume/tech_minimal.html",
    "creative_edge": "templates/resume/creative_edge.html",
}

async def render_pdf(resume_data: dict, template: str, color_theme: str) -> bytes:
    html = render_template(TEMPLATES[template], resume=resume_data, theme=color_theme)
    pdf_bytes = HTML(string=html).write_pdf()
    return pdf_bytes

async def render_docx(resume_data: dict) -> bytes:
    # Uses python-docx for DOCX export (Pro only)
    # Single-column, ATS-safe, no special formatting
    ...
```

---

### 4.1 PostgreSQL Tables

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  provider TEXT NOT NULL, -- 'google' | 'github'
  tier TEXT DEFAULT 'free', -- 'free' | 'pro' | 'team'
  credits_remaining INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Idea Generation Jobs
CREATE TABLE generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending', -- 'pending' | 'running' | 'done' | 'failed'
  ideas_count INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Idea Cards
CREATE TABLE idea_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES generation_jobs(id),
  problem TEXT NOT NULL,
  target_user TEXT NOT NULL,
  solution TEXT NOT NULL,
  stack TEXT[] NOT NULL,
  build_time_weeks INTEGER,
  niche_score NUMERIC(3,1),
  cluster_id TEXT,
  raw_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Monetization Reports
CREATE TABLE monetization_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES idea_cards(id),
  tam_estimate TEXT,
  pricing_model TEXT,
  price_range_usd TEXT,
  price_range_inr TEXT,
  competitors TEXT[],
  wtp_signal TEXT,
  distribution TEXT[],
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Saved Ideas (User Vault)
CREATE TABLE saved_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  idea_id UUID REFERENCES idea_cards(id),
  notes TEXT,
  saved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, idea_id)
);

-- Resumes
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,                          -- user-given label e.g. "SWE @ Google"
  template TEXT NOT NULL,
  color_theme TEXT DEFAULT 'default',
  job_description TEXT,                         -- optional, used for tailoring
  raw_input JSONB NOT NULL,                     -- original form data
  final_resume JSONB NOT NULL,                  -- processed output
  ai_score NUMERIC(4,3),                        -- internal AI detection score
  ats_score NUMERIC(4,3),
  pdf_url TEXT,                                 -- R2 presigned URL
  docx_url TEXT,                                -- R2 presigned URL (Pro only)
  version INTEGER DEFAULT 1,
  parent_id UUID REFERENCES resumes(id),        -- for versioning / tailored variants
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Resume Generation Jobs
CREATE TABLE resume_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  resume_id UUID REFERENCES resumes(id),
  status TEXT DEFAULT 'pending',               -- pending | drafting | humanizing | scoring | ats | done | failed
  pass2_attempts INTEGER DEFAULT 0,
  final_ai_score NUMERIC(4,3),
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);


CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE,
  plan TEXT NOT NULL, -- 'pro' | 'team'
  razorpay_subscription_id TEXT,
  status TEXT DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. API Endpoints

### Auth
```
POST   /api/auth/google        — OAuth callback
POST   /api/auth/github        — OAuth callback
POST   /api/auth/logout        — Clear session
GET    /api/auth/me            — Current user profile
```

### Ideas
```
POST   /api/ideas/generate     — Trigger new pipeline run (costs 1 credit)
GET    /api/ideas              — List all ideas for current user
GET    /api/ideas/:id          — Get single idea with monetization report
POST   /api/ideas/:id/save     — Save idea to vault
DELETE /api/ideas/:id/save     — Unsave idea
GET    /api/ideas/:id/export   — Generate and return PDF export URL
```

### Resume Builder
```
POST   /api/resume/generate         — Trigger resume pipeline (costs 1 resume credit)
GET    /api/resume                  — List all resumes for current user
GET    /api/resume/:id              — Get single resume with scores
PUT    /api/resume/:id              — Update resume title / notes
DELETE /api/resume/:id              — Delete resume
POST   /api/resume/:id/tailor       — Generate tailored variant for new JD
GET    /api/resume/:id/export/pdf   — Get PDF download URL
GET    /api/resume/:id/export/docx  — Get DOCX download URL (Pro only)
GET    /api/resume/:id/score        — Get AI + ATS score breakdown
```

### Jobs
```
GET    /api/jobs/:id           — Get job status + progress (poll or WS)
GET    /api/jobs               — List user's job history
```

### Subscriptions
```
POST   /api/billing/checkout   — Create Razorpay subscription session
POST   /api/billing/webhook    — Razorpay webhook handler
GET    /api/billing/status     — Current subscription status
DELETE /api/billing/cancel     — Cancel subscription
```

---

## 6. Redis Usage

| Key Pattern | TTL | Purpose |
|---|---|---|
| `job:{job_id}:status` | 1 hour | Real-time idea pipeline job progress |
| `resume_job:{job_id}:status` | 1 hour | Real-time resume pipeline progress |
| `user:{user_id}:credits` | None | Credits cache (sync with PG) |
| `signals:cache` | 6 hours | Cached scraper output |
| `ratelimit:{user_id}` | 1 minute | API rate limiting |
| `resume:{id}:pdf_url` | 1 hour | Cached R2 presigned URL |

---

## 7. Security

- All API routes protected with JWT session middleware
- Rate limiting: 10 requests/minute per user on `/ideas/generate`
- Credits deducted atomically (PostgreSQL transaction)
- Razorpay webhook signature verification (HMAC-SHA256)
- No PII stored in ChromaDB — only signal text + metadata
- CORS restricted to `shipordie.ai` origin in production

---

## 8. Environment Variables

```env
# App
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Vector DB
CHROMA_HOST=localhost
CHROMA_PORT=8000
PINECONE_API_KEY=      # prod only
PINECONE_INDEX=

# LLM
OLLAMA_BASE_URL=http://localhost:11434
GROQ_API_KEY=

# Payments
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Storage
R2_BUCKET_NAME=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=

# Resume Builder
RESUME_AI_SCORE_THRESHOLD=0.30     # max allowed score before re-humanizing
RESUME_MAX_RETRIES=3               # max Pass 2 retry attempts
WEASYPRINT_ENABLED=true            # PDF renderer

# Monitoring
SENTRY_DSN=
POSTHOG_KEY=
```

---

## 9. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Idea pipeline latency (p95) | < 90 seconds |
| Resume pipeline latency (p95) | < 60 seconds |
| Resume AI detection score | < 10% on GPTZero |
| Resume ATS compatibility | > 85% |
| API response time (non-pipeline) | < 200ms |
| Uptime | 99.5% |
| Concurrent pipeline runs | Up to 10 (Redis queue) |
| Data retention | Ideas + resumes 90 days (free), unlimited (pro) |
