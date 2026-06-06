import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.db.session import get_db
from backend.db.models import User, GenerationJob, ResumeJob
from backend.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])

@router.get("/{id}")
async def get_job_status(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves status of a background job. Checks both Idea and Resume job tables."""
    # 1. Check Idea Jobs
    stmt = select(GenerationJob).where(
        (GenerationJob.id == id) & 
        (GenerationJob.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    idea_job = res.scalar_one_or_none()
    
    if idea_job:
        return {
            "type": "idea",
            "id": str(idea_job.id),
            "status": idea_job.status,
            "ideas_count": idea_job.ideas_count,
            "duration_ms": idea_job.duration_ms,
            "created_at": idea_job.created_at.isoformat() if idea_job.created_at else None,
            "completed_at": idea_job.completed_at.isoformat() if idea_job.completed_at else None
        }
        
    # 2. Check Resume Jobs
    stmt = select(ResumeJob).where(
        (ResumeJob.id == id) & 
        (ResumeJob.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    resume_job = res.scalar_one_or_none()
    
    if resume_job:
        return {
            "type": "resume",
            "id": str(resume_job.id),
            "resume_id": str(resume_job.resume_id),
            "status": resume_job.status,
            "pass2_attempts": resume_job.pass2_attempts,
            "final_ai_score": float(resume_job.final_ai_score) if resume_job.final_ai_score else None,
            "duration_ms": resume_job.duration_ms,
            "created_at": resume_job.created_at.isoformat() if resume_job.created_at else None,
            "completed_at": resume_job.completed_at.isoformat() if resume_job.completed_at else None
        }
        
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Job {id} not found."
    )

@router.get("")
async def list_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lists history of all background jobs started by the user."""
    # Fetch idea generation jobs
    stmt_ideas = select(GenerationJob).where(GenerationJob.user_id == current_user.id).order_by(GenerationJob.created_at.desc())
    res_ideas = await db.execute(stmt_ideas)
    idea_jobs = res_ideas.scalars().all()
    
    # Fetch resume generation jobs
    stmt_resumes = select(ResumeJob).where(ResumeJob.user_id == current_user.id).order_by(ResumeJob.created_at.desc())
    res_resumes = await db.execute(stmt_resumes)
    resume_jobs = res_resumes.scalars().all()
    
    history = []
    for j in idea_jobs:
        history.append({
            "type": "idea",
            "id": str(j.id),
            "status": j.status,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "completed_at": j.completed_at.isoformat() if j.completed_at else None
        })
        
    for j in resume_jobs:
        history.append({
            "type": "resume",
            "id": str(j.id),
            "status": j.status,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "completed_at": j.completed_at.isoformat() if j.completed_at else None
        })
        
    # Sort by created_at desc
    history.sort(key=lambda x: x["created_at"] or "", reverse=True)
    return history
