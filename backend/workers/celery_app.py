import asyncio
import logging
from celery import Celery
from backend.config import settings

logger = logging.getLogger(__name__)

celery_app = Celery(
    "shipordie_workers",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Optional configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task(name="run_idea_pipeline")
def run_idea_pipeline_task(job_id: str, user_id: str):
    """Celery task wrapping the Idea Engine LangGraph execution."""
    from backend.pipeline.orchestrator import compiled_pipeline
    
    logger.info(f"Celery executing Idea Engine task for job {job_id}")
    
    async def run():
        await compiled_pipeline.ainvoke({
            "job_id": job_id,
            "user_id": user_id,
            "status": "pending",
            "signals": [],
            "clusters": [],
            "idea_cards": [],
            "monetization_reports": [],
            "error": None
        })
        
    loop = asyncio.get_event_loop()
    if loop.is_running():
        # In case we run in-process or in a running loop context
        future = asyncio.run_coroutine_threadsafe(run(), loop)
        future.result()
    else:
        asyncio.run(run())

@celery_app.task(name="run_resume_pipeline")
def run_resume_pipeline_task(
    job_id: str, 
    user_id: str, 
    user_input: dict, 
    template: str, 
    color_theme: str, 
    job_description: str = ""
):
    """Celery task wrapping the Resume Builder LangGraph execution."""
    from backend.pipeline.resume_orchestrator import compiled_resume_pipeline
    
    logger.info(f"Celery executing Resume Builder task for job {job_id}")
    
    async def run():
        await compiled_resume_pipeline.ainvoke({
            "job_id": job_id,
            "user_id": user_id,
            "user_input": user_input,
            "template": template,
            "color_theme": color_theme,
            "job_description": job_description,
            "draft_resume": None,
            "humanized_resume": None,
            "ai_score": None,
            "ats_score": None,
            "final_resume": None,
            "pass2_attempts": 0,
            "status": "pending",
            "error": None
        })
        
    loop = asyncio.get_event_loop()
    if loop.is_running():
        future = asyncio.run_coroutine_threadsafe(run(), loop)
        future.result()
    else:
        asyncio.run(run())
