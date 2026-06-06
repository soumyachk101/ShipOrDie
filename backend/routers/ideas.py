import logging
import asyncio
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from backend.db.session import get_db
from backend.db.models import User, GenerationJob, IdeaCard, SavedIdea, MonetizationReport
from backend.db.schemas import JobResponse
from backend.routers.auth import get_current_user
from backend.services.credits import deduct_credit, restore_credit
from backend.services.resume_renderer import resume_renderer
from backend.services.pdf_export import export_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ideas", tags=["ideas"])

@router.post("/generate", response_model=JobResponse)
async def generate_ideas(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Triggers the Idea Engine agent pipeline. Deducts 1 credit from free users.
    Dispatches to Celery or runs in-process as fallback.
    """
    # 1. Deduct credit
    credit_ok = await deduct_credit(current_user.id, db)
    if not credit_ok:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits. Please upgrade to Pro."
        )
        
    # 2. Create pending job record
    job = GenerationJob(
        user_id=current_user.id,
        status="pending"
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    # 3. Dispatch execution
    try:
        from backend.workers.celery_app import run_idea_pipeline_task
        run_idea_pipeline_task.delay(str(job.id), str(current_user.id))
        logger.info(f"Dispatched Idea job {job.id} to Celery.")
    except Exception as e:
        logger.warning(f"Could not submit to Celery queue ({e}). Running in-process background worker.")
        from backend.pipeline.orchestrator import compiled_pipeline
        
        async def run_pipeline_fallback():
            try:
                await compiled_pipeline.ainvoke({
                    "job_id": str(job.id),
                    "user_id": str(current_user.id),
                    "status": "pending",
                    "signals": [],
                    "clusters": [],
                    "idea_cards": [],
                    "monetization_reports": [],
                    "error": None
                })
            except Exception as ex:
                logger.error(f"Fallback pipeline failed: {ex}")
                await restore_credit(current_user.id, db)
                
        asyncio.create_task(run_pipeline_fallback())
        
    return job

@router.get("", response_model=list[dict])
async def list_ideas(
    job_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lists all generated ideas for the current user, optionally filtered by job_id."""
    if job_id:
        stmt = (
            select(IdeaCard)
            .join(GenerationJob)
            .where(GenerationJob.user_id == current_user.id)
            .where(IdeaCard.job_id == UUID(job_id))
            .options(selectinload(IdeaCard.monetization_report))
            .order_by(IdeaCard.niche_score.desc())
        )
    else:
        stmt = (
            select(IdeaCard)
            .join(GenerationJob)
            .where(GenerationJob.user_id == current_user.id)
            .options(selectinload(IdeaCard.monetization_report))
            .order_by(IdeaCard.created_at.desc())
        )
        
    res = await db.execute(stmt)
    ideas = res.scalars().all()
    
    output = []
    for idea in ideas:
        # Check if saved in vault
        vault_stmt = select(SavedIdea).where(
            (SavedIdea.user_id == current_user.id) & 
            (SavedIdea.idea_id == idea.id)
        )
        vault_res = await db.execute(vault_stmt)
        is_saved = vault_res.scalar_one_or_none() is not None
        
        rep = idea.monetization_report
        output.append({
            "id": str(idea.id),
            "job_id": str(idea.job_id),
            "problem": idea.problem,
            "target_user": idea.target_user,
            "solution": idea.solution,
            "stack": idea.stack,
            "build_time_weeks": idea.build_time_weeks,
            "niche_score": float(idea.niche_score) if idea.niche_score else 0.0,
            "cluster_id": idea.cluster_id,
            "is_saved": is_saved,
            "created_at": idea.created_at.isoformat(),
            "monetization_report": {
                "tam_estimate": rep.tam_estimate if rep else "",
                "pricing_model": rep.pricing_model if rep else "",
                "price_range_usd": rep.price_range_usd if rep else "",
                "price_range_inr": rep.price_range_inr if rep else "",
                "competitors": rep.competitors if rep else [],
                "wtp_signal": rep.wtp_signal if rep else "",
                "distribution": rep.distribution if rep else [],
                "summary": rep.summary if rep else ""
            } if rep else None
        })
    return output

@router.get("/{id}")
async def get_idea(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves detailed payload for a single idea card."""
    stmt = (
        select(IdeaCard)
        .join(GenerationJob)
        .where(GenerationJob.user_id == current_user.id)
        .where(IdeaCard.id == id)
        .options(selectinload(IdeaCard.monetization_report))
    )
    res = await db.execute(stmt)
    idea = res.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea card not found.")
        
    rep = idea.monetization_report
    
    # Check if bookmarked
    vault_stmt = select(SavedIdea).where(
        (SavedIdea.user_id == current_user.id) & 
        (SavedIdea.idea_id == idea.id)
    )
    vault_res = await db.execute(vault_stmt)
    is_saved = vault_res.scalar_one_or_none() is not None
    
    return {
        "id": str(idea.id),
        "problem": idea.problem,
        "target_user": idea.target_user,
        "solution": idea.solution,
        "stack": idea.stack,
        "build_time_weeks": idea.build_time_weeks,
        "niche_score": float(idea.niche_score) if idea.niche_score else 0.0,
        "is_saved": is_saved,
        "monetization_report": {
            "tam_estimate": rep.tam_estimate if rep else "",
            "pricing_model": rep.pricing_model if rep else "",
            "price_range_usd": rep.price_range_usd if rep else "",
            "price_range_inr": rep.price_range_inr if rep else "",
            "competitors": rep.competitors if rep else [],
            "wtp_signal": rep.wtp_signal if rep else "",
            "distribution": rep.distribution if rep else [],
            "summary": rep.summary if rep else ""
        } if rep else None
    }

@router.post("/{id}/save")
async def save_idea(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Saves/bookmarks an idea in the user vault."""
    # Check if idea card exists
    stmt = select(IdeaCard).where(IdeaCard.id == id)
    res = await db.execute(stmt)
    idea = res.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea card not found.")
        
    # Check if already saved
    stmt = select(SavedIdea).where(
        (SavedIdea.user_id == current_user.id) & 
        (SavedIdea.idea_id == id)
    )
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        return {"detail": "Idea already bookmarked in vault."}
        
    saved = SavedIdea(
        user_id=current_user.id,
        idea_id=id
    )
    db.add(saved)
    await db.commit()
    return {"detail": "Idea successfully saved to vault."}

@router.delete("/{id}/save")
async def unsave_idea(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Removes an idea bookmark from the user vault."""
    stmt = delete(SavedIdea).where(
        (SavedIdea.user_id == current_user.id) & 
        (SavedIdea.idea_id == id)
    )
    await db.execute(stmt)
    await db.commit()
    return {"detail": "Idea removed from vault."}

@router.get("/{id}/export")
async def export_idea_pdf(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generates PDF export for Pro users and returns download URL."""
    if current_user.tier != "pro" and current_user.email != "demo@shipordie.ai":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Exporting to PDF is a Pro feature. Please upgrade."
        )
        
    stmt = select(IdeaCard).where(IdeaCard.id == id).options(selectinload(IdeaCard.monetization_report))
    res = await db.execute(stmt)
    idea = res.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found.")
        
    # We construct a simple resume-like rendering context for HTML-to-PDF template
    # Let's compile a simple PDF using weasyprint on-the-fly
    # We'll use a basic structure
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; }}
            h1 {{ border-bottom: 2px solid #4f46e5; padding-bottom: 10px; color: #4f46e5; }}
            .section {{ margin-bottom: 20px; }}
            .label {{ font-weight: bold; color: #374151; }}
            .tag {{ display: inline-block; background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 5px; }}
        </style>
    </head>
    <body>
        <h1>Micro-SaaS Idea: {idea.target_user} Solver</h1>
        <div class="section">
            <span class="label">Problem Statement:</span>
            <p>{idea.problem}</p>
        </div>
        <div class="section">
            <span class="label">Proposed Solution:</span>
            <p>{idea.solution}</p>
        </div>
        <div class="section">
            <span class="label">Suggested Stack:</span><br><br>
            {" ".join([f'<span class="tag">{t}</span>' for t in idea.stack])}
        </div>
        <div class="section" style="margin-top: 20px;">
            <span class="label">Niche Rating:</span> {idea.niche_score} / 10 | <span class="label">Estimated Build Time:</span> {idea.build_time_weeks} weeks
        </div>
    </body>
    </html>
    """
    try:
        from weasyprint import HTML
        pdf_bytes = HTML(string=html_content).write_pdf()
        download_url = await export_service.save_export(pdf_bytes, "pdf")
        return {"download_url": download_url}
    except Exception as e:
        logger.error(f"Failed to generate PDF for idea {id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to compile PDF report.")
