import logging
import asyncio
from datetime import datetime
from uuid import UUID
from langgraph.graph import StateGraph, END
from sqlalchemy import update, select

from backend.pipeline.state import PipelineState
from backend.agents.scraper_agent import ScraperAgent
from backend.agents.synthesizer_agent import SynthesizerAgent
from backend.agents.idea_gen_agent import IdeaGenAgent
from backend.agents.monetization_agent import MonetizationAgent

from backend.db.session import async_session
from backend.db.models import GenerationJob, IdeaCard, MonetizationReport
from backend.config import settings

logger = logging.getLogger(__name__)

# Redis helper to update live status
async def publish_redis_status(job_id: str, status: str):
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(settings.REDIS_URL)
        await r.set(f"job:{job_id}:status", status, ex=3600)
        # Publish notification for websockets
        await r.publish(f"job:{job_id}", status)
        await r.close()
    except Exception as e:
        logger.debug(f"Redis status publish failed (usually okay in offline mode): {e}")

async def update_db_job_status(job_id: str, status: str):
    async with async_session() as session:
        try:
            stmt = (
                update(GenerationJob)
                .where(GenerationJob.id == UUID(job_id))
                .values(status=status)
            )
            await session.execute(stmt)
            await session.commit()
        except Exception as e:
            logger.error(f"Failed to update job status in DB: {e}")

# Nodes
async def scraper_node(state: PipelineState) -> PipelineState:
    job_id = state["job_id"]
    try:
        logger.info(f"Node [scrape]: Running for job {job_id}")
        await publish_redis_status(job_id, "scraping")
        await update_db_job_status(job_id, "scraping")
        
        signals = await ScraperAgent().run()
        return {**state, "status": "scraping", "signals": signals}
    except Exception as e:
        logger.error(f"Scraper node failed: {e}")
        return {**state, "status": "failed", "error": str(e)}

async def synthesizer_node(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    job_id = state["job_id"]
    try:
        logger.info(f"Node [synthesize]: Running for job {job_id}")
        await publish_redis_status(job_id, "synthesizing")
        await update_db_job_status(job_id, "synthesizing")
        
        clusters = await SynthesizerAgent().run(state["signals"])
        return {**state, "status": "synthesizing", "clusters": clusters}
    except Exception as e:
        logger.error(f"Synthesizer node failed: {e}")
        return {**state, "status": "failed", "error": str(e)}

async def idea_gen_node(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    job_id = state["job_id"]
    try:
        logger.info(f"Node [generate]: Running for job {job_id}")
        await publish_redis_status(job_id, "generating")
        await update_db_job_status(job_id, "generating")
        
        idea_cards = await IdeaGenAgent().run(state["clusters"])
        return {**state, "status": "generating", "idea_cards": idea_cards}
    except Exception as e:
        logger.error(f"Idea Gen node failed: {e}")
        return {**state, "status": "failed", "error": str(e)}

async def monetization_node(state: PipelineState) -> PipelineState:
    if state.get("error"):
        return state
    job_id = state["job_id"]
    try:
        logger.info(f"Node [monetize]: Running for job {job_id}")
        await publish_redis_status(job_id, "monetizing")
        await update_db_job_status(job_id, "monetizing")
        
        agent = MonetizationAgent()
        reports = []
        for idea in state["idea_cards"]:
            report = await agent.run(idea)
            reports.append(report)
            
        return {**state, "status": "monetizing", "monetization_reports": reports}
    except Exception as e:
        logger.error(f"Monetization node failed: {e}")
        return {**state, "status": "failed", "error": str(e)}

async def finalize_node(state: PipelineState) -> PipelineState:
    job_id = state["job_id"]
    if state.get("error"):
        await publish_redis_status(job_id, "failed")
        await update_db_job_status(job_id, "failed")
        return state
        
    try:
        logger.info(f"Node [finalize]: Saving job results to DB for job {job_id}")
        
        async with async_session() as session:
            # 1. Fetch the Job
            stmt = select(GenerationJob).where(GenerationJob.id == UUID(job_id))
            res = await session.execute(stmt)
            job = res.scalar_one_or_none()
            if not job:
                raise ValueError(f"Job {job_id} not found in database.")
                
            # 2. Add Idea Cards & Monetization Reports
            idea_models = []
            for idea_data in state["idea_cards"]:
                idea_id = UUID(idea_data["id"])
                
                # Find matching monetization report
                matching_rep = None
                for rep in state["monetization_reports"]:
                    if rep.get("idea_id") == idea_data["id"]:
                        matching_rep = rep
                        break
                
                # Create Idea Model
                idea_db = IdeaCard(
                    id=idea_id,
                    job_id=job.id,
                    problem=idea_data["problem"],
                    target_user=idea_data["target_user"],
                    solution=idea_data["solution"],
                    stack=idea_data["stack"],
                    build_time_weeks=int(idea_data["build_time_weeks"]),
                    niche_score=idea_data["niche_score"],
                    cluster_id=idea_data.get("cluster_id"),
                    raw_json=idea_data
                )
                session.add(idea_db)
                
                if matching_rep:
                    mon_db = MonetizationReport(
                        idea_id=idea_id,
                        tam_estimate=matching_rep.get("tam_estimate"),
                        pricing_model=matching_rep.get("pricing_model"),
                        price_range_usd=matching_rep.get("price_range_usd"),
                        price_range_inr=matching_rep.get("price_range_inr"),
                        competitors=matching_rep.get("competitors"),
                        wtp_signal=matching_rep.get("wtp_signal"),
                        distribution=matching_rep.get("distribution"),
                        summary=matching_rep.get("summary")
                    )
                    session.add(mon_db)
                    
            # Update job state
            job.status = "done"
            job.ideas_count = len(state["idea_cards"])
            job.completed_at = datetime.utcnow()
            
            # Record duration if job.created_at exists
            if job.created_at:
                delta = job.completed_at.replace(tzinfo=None) - job.created_at.replace(tzinfo=None)
                job.duration_ms = int(delta.total_seconds() * 1000)
                
            await session.commit()
            
        await publish_redis_status(job_id, "done")
        logger.info(f"Pipeline job {job_id} successfully finalized and committed.")
        return {**state, "status": "done"}
    except Exception as e:
        logger.error(f"Finalize node failed to commit to DB: {e}")
        await publish_redis_status(job_id, "failed")
        await update_db_job_status(job_id, "failed")
        return {**state, "status": "failed", "error": str(e)}

def build_pipeline() -> StateGraph:
    """Builds and compiles the StateGraph workflow."""
    graph = StateGraph(PipelineState)
    
    # Register Nodes
    graph.add_node("scrape", scraper_node)
    graph.add_node("synthesize", synthesizer_node)
    graph.add_node("generate", idea_gen_node)
    graph.add_node("monetize", monetization_node)
    graph.add_node("finalize", finalize_node)
    
    # Set Edges
    graph.set_entry_point("scrape")
    graph.add_edge("scrape", "synthesize")
    graph.add_edge("synthesize", "generate")
    graph.add_edge("generate", "monetize")
    graph.add_edge("monetize", "finalize")
    graph.add_edge("finalize", END)
    
    return graph.compile()

# Instantiated compiled workflow
compiled_pipeline = build_pipeline()
