import logging
import asyncio
from datetime import datetime
from uuid import UUID
from langgraph.graph import StateGraph, END
from sqlalchemy import update, select

from backend.pipeline.resume_state import ResumePipelineState
from backend.agents.resume.draft_agent import DraftAgent
from backend.agents.resume.humanizer_agent import HumanizerAgent
from backend.agents.resume.score_checker import ScoreChecker
from backend.agents.resume.ats_agent import ATSAgent

from backend.db.session import async_session
from backend.db.models import Resume, ResumeJob
from backend.config import settings

logger = logging.getLogger(__name__)

async def publish_resume_redis_status(job_id: str, status: str):
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.REDIS_URL)
        await r.set(f"resume_job:{job_id}:status", status, ex=3600)
        await r.publish(f"resume_job:{job_id}", status)
        await r.close()
    except Exception as e:
        logger.debug(f"Redis status publish failed (usually okay in offline mode): {e}")

async def update_db_resume_job_status(job_id: str, status: str, pass2_attempts: int = 0):
    async with async_session() as session:
        try:
            stmt = (
                update(ResumeJob)
                .where(ResumeJob.id == UUID(job_id))
                .values(status=status, pass2_attempts=pass2_attempts)
            )
            await session.execute(stmt)
            await session.commit()
        except Exception as e:
            logger.error(f"Failed to update resume job status in DB: {e}")

# Nodes
async def draft_node(state: ResumePipelineState) -> ResumePipelineState:
    job_id = state["job_id"]
    try:
        logger.info(f"Node [draft]: Running for job {job_id}")
        await publish_resume_redis_status(job_id, "drafting")
        await update_db_resume_job_status(job_id, "drafting")
        
        draft = await DraftAgent().run(state["user_input"], state.get("job_description", ""))
        return {**state, "status": "drafting", "draft_resume": draft}
    except Exception as e:
        logger.error(f"Draft node failed: {e}")
        return {**state, "status": "failed", "error": str(e)}

async def humanize_node(state: ResumePipelineState) -> ResumePipelineState:
    if state.get("error"):
        return state
    job_id = state["job_id"]
    try:
        logger.info(f"Node [humanize]: Running for job {job_id}")
        await publish_resume_redis_status(job_id, "humanizing")
        await update_db_resume_job_status(job_id, "humanizing", state.get("pass2_attempts", 0))
        
        # Increase temperature on retries to randomize sentence structures more
        attempts = state.get("pass2_attempts", 0)
        temp = 0.6 + (attempts * 0.1)
        
        source_resume = state["draft_resume"]
        # If we already humanized once, rewrite the humanized version instead
        if state.get("humanized_resume"):
            source_resume = state["humanized_resume"]
            
        humanized = await HumanizerAgent().run(source_resume, temperature=temp)
        return {**state, "status": "humanizing", "humanized_resume": humanized}
    except Exception as e:
        logger.error(f"Humanize node failed: {e}")
        return {**state, "status": "failed", "error": str(e)}

async def score_node(state: ResumePipelineState) -> ResumePipelineState:
    if state.get("error"):
        return state
    job_id = state["job_id"]
    try:
        logger.info(f"Node [score]: Running for job {job_id}")
        await publish_resume_redis_status(job_id, "scoring")
        await update_db_resume_job_status(job_id, "scoring", state.get("pass2_attempts", 0))
        
        score = ScoreChecker().score(state["humanized_resume"])
        logger.info(f"Calculated AI detection score: {score}")
        
        return {**state, "status": "scoring", "ai_score": score}
    except Exception as e:
        logger.error(f"Score node failed: {e}")
        return {**state, "status": "failed", "error": str(e)}

async def ats_node(state: ResumePipelineState) -> ResumePipelineState:
    if state.get("error"):
        return state
    job_id = state["job_id"]
    try:
        logger.info(f"Node [ats]: Running for job {job_id}")
        await publish_resume_redis_status(job_id, "ats")
        await update_db_resume_job_status(job_id, "ats", state.get("pass2_attempts", 0))
        
        ats_opt = await ATSAgent().run(state["humanized_resume"], state.get("job_description", ""))
        
        # Calculate dynamic ATS score based on keyword match rate
        jd = state.get("job_description", "")
        keywords = ATSAgent()._extract_keywords(jd)
        if keywords:
            flat_text = str(ats_opt).lower()
            matched = sum(1 for kw in keywords if kw.lower() in flat_text)
            ats_score = 0.70 + (matched / len(keywords) * 0.28) # 70% base, up to 98%
        else:
            ats_score = 0.88 # good default ATS score
            
        return {**state, "status": "ats", "final_resume": ats_opt, "ats_score": round(ats_score, 3)}
    except Exception as e:
        logger.error(f"ATS node failed: {e}")
        return {**state, "status": "failed", "error": str(e)}

async def finalize_node(state: ResumePipelineState) -> ResumePipelineState:
    job_id = state["job_id"]
    if state.get("error"):
        await publish_resume_redis_status(job_id, "failed")
        await update_db_resume_job_status(job_id, "failed", state.get("pass2_attempts", 0))
        return state
        
    try:
        logger.info(f"Node [finalize]: Finalizing resume job {job_id}")
        
        async with async_session() as session:
            # 1. Fetch the Job
            stmt = select(ResumeJob).where(ResumeJob.id == UUID(job_id))
            res = await session.execute(stmt)
            job = res.scalar_one_or_none()
            if not job:
                raise ValueError(f"Resume job {job_id} not found in database.")
                
            # 2. Fetch the Resume
            stmt = select(Resume).where(Resume.id == job.resume_id)
            res = await session.execute(stmt)
            resume = res.scalar_one_or_none()
            if not resume:
                raise ValueError(f"Resume {job.resume_id} not found in database.")
                
            # 3. Update Resume and Job models
            resume.final_resume = state["final_resume"]
            resume.ai_score = state["ai_score"]
            resume.ats_score = state["ats_score"]
            resume.pdf_url = f"/api/resume/{resume.id}/export/pdf"
            
            job.status = "done"
            job.final_ai_score = state["ai_score"]
            job.completed_at = datetime.utcnow()
            
            if job.created_at:
                delta = job.completed_at.replace(tzinfo=None) - job.created_at.replace(tzinfo=None)
                job.duration_ms = int(delta.total_seconds() * 1000)
                
            await session.commit()
            
        await publish_resume_redis_status(job_id, "done")
        logger.info(f"Resume job {job_id} successfully completed and committed.")
        return {**state, "status": "done"}
    except Exception as e:
        logger.error(f"Finalize node failed to commit to DB: {e}")
        await publish_resume_redis_status(job_id, "failed")
        await update_db_resume_job_status(job_id, "failed", state.get("pass2_attempts", 0))
        return {**state, "status": "failed", "error": str(e)}

# Condition Routing
def check_score_routing(state: ResumePipelineState):
    if state.get("error"):
        return "finalize"
        
    score = state.get("ai_score") or 1.0
    attempts = state.get("pass2_attempts", 0)
    
    # AI detection score threshold is 30% (0.30)
    if score > settings.RESUME_AI_SCORE_THRESHOLD and attempts < settings.RESUME_MAX_RETRIES:
        # Loop back to humanize
        logger.info(f"AI score {score} > threshold {settings.RESUME_AI_SCORE_THRESHOLD}. Retrying humanization (Attempt {attempts + 1})...")
        state["pass2_attempts"] = attempts + 1
        return "humanize"
        
    return "ats"

def build_resume_pipeline() -> StateGraph:
    """Builds and compiles the Resume LangGraph workflow."""
    graph = StateGraph(ResumePipelineState)
    
    # Register Nodes
    graph.add_node("draft", draft_node)
    graph.add_node("humanize", humanize_node)
    graph.add_node("score", score_node)
    graph.add_node("ats", ats_node)
    graph.add_node("finalize", finalize_node)
    
    # Set Edges
    graph.set_entry_point("draft")
    graph.add_edge("draft", "humanize")
    graph.add_edge("humanize", "score")
    
    # Conditional edge from score: either loops back to humanize or goes to ats
    graph.add_conditional_edges(
        "score",
        check_score_routing,
        {
            "humanize": "humanize",
            "ats": "ats",
            "finalize": "finalize"
        }
    )
    
    graph.add_edge("ats", "finalize")
    graph.add_edge("finalize", END)
    
    return graph.compile()

compiled_resume_pipeline = build_resume_pipeline()
