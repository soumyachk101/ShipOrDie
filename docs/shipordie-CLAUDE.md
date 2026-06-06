# ShipOrDie — AI Instructions (CLAUDE.md)

> This file is the primary ingestion document for Claude Code.  
> Read this before touching any file in this repository.  
> **v2.0 — Resume Builder module added.**

---

## 1. Project Identity

**ShipOrDie** is a two-module platform:
- **Idea Engine** — multi-agent Micro-SaaS idea generation with monetization reports
- **Resume Builder** — anti-AI-detection resume generator with ATS optimization

**Founder:** Soumya Chakraborty  
**Repo:** `shipordie`  
**Status:** Active development

---

## 2. Repository Structure

```
shipordie/
├── frontend/                   # Next.js 14 App Router
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── signin/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── generate/
│   │   │   ├── ideas/
│   │   │   │   └── [job_id]/
│   │   │   ├── vault/
│   │   │   ├── resume/
│   │   │   │   ├── new/        # Multi-step resume form
│   │   │   │   ├── generating/ # Pipeline progress screen
│   │   │   │   └── [id]/       # Preview + scores
│   │   │   └── settings/
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── IdeaCard/
│   │   ├── PipelineProgress/
│   │   ├── MonetizationReport/
│   │   ├── ResumeForm/         # Multi-step form steps
│   │   ├── ResumePreview/      # Rendered resume preview
│   │   └── ScoreBadge/         # AI + ATS score display
│   ├── lib/
│   │   ├── api.ts
│   │   └── auth.ts
│   └── store/
│       └── useAppStore.ts      # Zustand (includes resumeFormStore)
│
├── backend/                    # FastAPI
│   ├── main.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── ideas.py
│   │   ├── jobs.py
│   │   ├── resume.py           # NEW — Resume Builder endpoints
│   │   └── billing.py
│   ├── agents/
│   │   ├── scraper_agent.py
│   │   ├── synthesizer_agent.py
│   │   ├── idea_gen_agent.py
│   │   ├── monetization_agent.py
│   │   └── resume/             # NEW — Resume agent files
│   │       ├── draft_agent.py
│   │       ├── humanizer_agent.py
│   │       ├── score_checker.py
│   │       ├── ats_agent.py
│   │       └── forbidden_words.txt
│   ├── pipeline/
│   │   ├── orchestrator.py     # Idea pipeline LangGraph
│   │   ├── resume_orchestrator.py  # NEW — Resume pipeline LangGraph
│   │   ├── state.py
│   │   └── resume_state.py     # NEW — Resume pipeline state
│   ├── tools/
│   │   ├── reddit_tool.py
│   │   ├── producthunt_tool.py
│   │   ├── hackernews_tool.py
│   │   └── google_trends_tool.py
│   ├── templates/
│   │   └── resume/             # NEW — Jinja2 HTML templates
│   │       ├── classic_ats.html
│   │       ├── modern_split.html
│   │       ├── tech_minimal.html
│   │       └── creative_edge.html
│   ├── db/
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── migrations/
│   ├── services/
│   │   ├── vector_store.py
│   │   ├── credits.py
│   │   ├── pdf_export.py       # Updated — handles both ideas and resumes
│   │   ├── resume_renderer.py  # NEW — WeasyPrint PDF + python-docx DOCX
│   │   └── razorpay.py
│   ├── workers/
│   │   └── celery_app.py
│   └── config.py
│
├── docker-compose.yml
├── .env.example
└── CLAUDE.md
```

---

## 3. Core Conventions

### 3.1 Python (Backend)

- Python 3.11+
- **Always use `async/await`** for all I/O — no blocking calls in FastAPI routes
- Type hints on every function signature
- Pydantic v2 for all schemas (not v1 syntax)
- SQLAlchemy 2.0 async style (`async with AsyncSession`)
- Never use `print()` for debugging — use `logging` module
- Error responses always return `{"detail": "message"}` format

```python
# ✅ Correct FastAPI route pattern
@router.post("/ideas/generate", response_model=JobResponse)
async def generate_ideas(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> JobResponse:
    ...
```

### 3.2 TypeScript (Frontend)

- Strict mode enabled (`"strict": true` in tsconfig)
- Use `interface` for object types, `type` for unions/primitives
- All API calls go through `lib/api.ts` — never raw fetch in components
- Use `React Query` (`useQuery`, `useMutation`) for all server state
- Zustand for UI state only (modals, filters, sidebar state)
- No `any` types — use `unknown` + type guards if needed

```typescript
// ✅ Correct data fetching pattern
const { data: ideas, isLoading } = useQuery({
  queryKey: ['ideas', jobId],
  queryFn: () => api.get<IdeaCard[]>(`/ideas?job_id=${jobId}`),
  enabled: !!jobId,
});
```

### 3.3 Database

- All DB access through SQLAlchemy ORM — no raw SQL except migrations
- UUID primary keys for all tables (use `gen_random_uuid()`)
- All timestamps in UTC (`TIMESTAMPTZ`)
- Alembic for all schema changes — never modify tables manually
- Run `alembic revision --autogenerate -m "description"` for new migrations

### 3.4 Agent Code

- Each agent in its own file under `backend/agents/`
- Agents communicate via shared `PipelineState` (TypedDict)
- LangGraph nodes = agent functions; edges = conditional transitions
- All agent prompts in `backend/agents/prompts/` as `.txt` files — not hardcoded in Python
- LLM calls always go through `config.get_llm()` — never instantiate LLM directly

---

## 4. Agent Pipeline — Code Conventions

### Pipeline State

```python
# backend/pipeline/state.py
from typing import TypedDict, List, Optional

class PipelineState(TypedDict):
    job_id: str
    user_id: str
    status: str  # pending | scraping | synthesizing | generating | monetizing | done | failed
    signals: List[dict]
    clusters: List[dict]
    idea_cards: List[dict]
    monetization_reports: List[dict]
    error: Optional[str]
```

### LangGraph Orchestration

```python
# backend/pipeline/orchestrator.py
from langgraph.graph import StateGraph, END

def build_pipeline() -> StateGraph:
    graph = StateGraph(PipelineState)
    
    graph.add_node("scrape", scraper_node)
    graph.add_node("synthesize", synthesizer_node)
    graph.add_node("generate", idea_gen_node)
    graph.add_node("monetize", monetization_node)
    graph.add_node("finalize", finalize_node)
    
    graph.set_entry_point("scrape")
    graph.add_edge("scrape", "synthesize")
    graph.add_edge("synthesize", "generate")
    graph.add_edge("generate", "monetize")
    graph.add_edge("monetize", "finalize")
    graph.add_edge("finalize", END)
    
    return graph.compile()
```

### Agent Node Pattern

```python
async def scraper_node(state: PipelineState) -> PipelineState:
    try:
        await update_job_status(state["job_id"], "scraping")
        signals = await ScraperAgent().run()
        return {**state, "signals": signals}
    except Exception as e:
        logger.error(f"Scraper failed: {e}")
        return {**state, "status": "failed", "error": str(e)}
```

---

## 5. Key Business Logic

### 5.1 Credit System

```python
# backend/services/credits.py

async def deduct_credit(user_id: str, db: AsyncSession) -> bool:
    """
    Atomically deduct 1 credit. Returns False if insufficient credits.
    Pro users always return True (unlimited).
    """
    async with db.begin():
        user = await db.get(User, user_id, with_for_update=True)
        if user.tier == "pro":
            return True
        if user.credits_remaining <= 0:
            return False
        user.credits_remaining -= 1
        return True

async def restore_credit(user_id: str, db: AsyncSession) -> None:
    """Call this if pipeline fails after credit deduction."""
    async with db.begin():
        user = await db.get(User, user_id, with_for_update=True)
        if user.tier != "pro":
            user.credits_remaining += 1
```

### 5.2 Deduplication Logic

```python
def is_duplicate_cluster(new_embedding, existing_embeddings, threshold=0.85) -> bool:
    """
    Returns True if new cluster is too similar to any existing one.
    Uses cosine similarity.
    """
    if not existing_embeddings:
        return False
    similarities = cosine_similarity([new_embedding], existing_embeddings)[0]
    return float(max(similarities)) > threshold
```

### 5.3 LLM JSON Parsing (with retry)

```python
async def call_llm_json(prompt: str, schema: type, max_retries: int = 3) -> dict:
    """
    Call LLM and parse response as JSON. Retries on parse failure.
    """
    for attempt in range(max_retries):
        response = await llm.ainvoke(prompt)
        try:
            text = response.content.strip()
            # Strip markdown fences if present
            if text.startswith("```"):
                text = re.sub(r"```(?:json)?", "", text).strip()
            return schema.model_validate_json(text)
        except (json.JSONDecodeError, ValidationError) as e:
            logger.warning(f"LLM JSON parse failed attempt {attempt+1}: {e}")
            if attempt == max_retries - 1:
                raise
```

### 5.3 Resume Credit System

```python
# Resume credits are separate from idea credits
# Free tier: 1 resume/month
# Pro tier: 10 resumes/month (tracked in users.resume_credits_remaining)

async def deduct_resume_credit(user_id: str, db: AsyncSession) -> bool:
    async with db.begin():
        user = await db.get(User, user_id, with_for_update=True)
        if user.tier == "pro" and user.resume_credits_remaining > 0:
            user.resume_credits_remaining -= 1
            return True
        if user.tier == "free" and user.resume_credits_remaining > 0:
            user.resume_credits_remaining -= 1
            return True
        return False
```

### 5.4 Humanization — Forbidden Words Enforcement

```python
# backend/agents/resume/forbidden_words.txt must be loaded at startup
# NEVER hardcode the list in Python — it will be updated frequently

FORBIDDEN_WORDS: set[str] = set()

@app.on_event("startup")
async def load_forbidden_words():
    global FORBIDDEN_WORDS
    with open("agents/resume/forbidden_words.txt") as f:
        FORBIDDEN_WORDS = {w.strip().lower() for w in f.read().split(",")}
```

### 5.5 AI Score Threshold

```python
# config.py
RESUME_AI_SCORE_THRESHOLD = float(os.getenv("RESUME_AI_SCORE_THRESHOLD", "0.30"))
RESUME_MAX_RETRIES = int(os.getenv("RESUME_MAX_RETRIES", "3"))

# If score > threshold after max retries → return best attempt, flag in DB
# Never block the user — always return a result
```



- **Never hardcode forbidden words list** — always load from `forbidden_words.txt`
- **Never block user if AI score stays high after max retries** — return best result, log the score
- **Never use tables or columns in DOCX resume export** — breaks ATS parsers
- **Never call external AI detection APIs** (GPTZero, Originality.ai) — use internal scorer only
- **Never store resume PDF permanently on R2** — use presigned URLs with 1-hour expiry, regenerate on demand
- **Never hardcode API keys** — always use `config.py` / env vars
- **Never use `time.sleep()`** — use `asyncio.sleep()` in async context
- **Never call agents directly from FastAPI routes** — always dispatch to Celery worker
- **Never store user passwords** — OAuth only, no email/password auth
- **Never return raw SQLAlchemy model objects** — always convert to Pydantic schema first
- **Never skip credit deduction rollback** — both idea and resume pipeline failures must restore credits
- **Never commit directly to `main`** — branch → PR flow

---

## 7. Local Development Setup

```bash
# Clone and setup
git clone https://github.com/soumyachk101/shipordie
cd shipordie

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Resume Builder extra deps:
pip install weasyprint python-docx nltk
python -c "import nltk; nltk.download('punkt')"  # for sentence tokenizer
cp ../.env.example .env
alembic upgrade head
uvicorn main:app --reload --port 8000

# Frontend
cd ../frontend
npm install
cp ../.env.example .env.local
npm run dev

# Services (separate terminals)
docker-compose up postgres redis chromadb   # databases
celery -A workers.celery_app worker --loglevel=info  # worker
ollama run llama3.2  # local LLM

# Run full stack
docker-compose up
```

---

## 8. Testing Strategy

- Unit tests: `pytest` for agent logic, credit system, dedup logic
- Integration tests: FastAPI `TestClient` for all API routes
- Frontend: `Vitest` + `React Testing Library` for components
- E2E: `Playwright` for critical flows (generate → view → export)

```bash
# Run tests
cd backend && pytest tests/ -v
cd frontend && npm run test
cd frontend && npx playwright test
```

---

## 9. Deployment

### Backend (Railway)
```
railway up
railway variables set DATABASE_URL=... REDIS_URL=... (etc.)
```

### Frontend (Vercel)
```
vercel --prod
# Set env vars in Vercel dashboard
```

### ChromaDB
- Run as Docker container on Railway
- Persist volume: `/chroma/chroma`

---

## 10. Contact

**Soumya Chakraborty**  
Portfolio: chksoumya.in  
GitHub: github.com/soumyachk101
