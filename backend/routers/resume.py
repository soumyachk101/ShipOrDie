import logging
import asyncio
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Response, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update

from backend.db.session import get_db
from backend.db.models import User, Resume, ResumeJob
from backend.db.schemas import ResumeGenerateRequest, ResumeResponse, ResumeJobResponse
from backend.routers.auth import get_current_user
from backend.services.credits import deduct_resume_credit, restore_resume_credit
from backend.services.resume_renderer import resume_renderer
from backend.services.pdf_export import export_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/resume", tags=["resume"])

@router.post("/parse")
async def parse_resume(
    file: UploadFile | None = File(None),
    text: str | None = Form(None)
):
    """
    Parses an uploaded PDF file or pasted raw text resume.
    Returns structured resume JSON data.
    """
    logger.info("Parsing resume request received...")
    extracted_text = ""
    
    # 1. Read PDF file if present
    if file:
        logger.info(f"Received file: {file.filename}, content-type: {file.content_type}")
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file format. Only PDF files are supported."
            )
        try:
            file_bytes = await file.read()
            import pypdf
            import io
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                extracted_text += page.extract_text() or ""
        except Exception as e:
            logger.error(f"Failed to read PDF file: {e}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to read PDF file: {str(e)}"
            )
            
    # 2. Else read raw text
    elif text:
        logger.info("Received raw text input.")
        extracted_text = text
        
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either a PDF file or text content must be provided."
        )
        
    if not extracted_text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No readable text found in the input."
        )
        
    # 3. Parse with service
    try:
        from backend.services.resume_parser import resume_parser
        structured_data = await resume_parser.parse(extracted_text)
        return structured_data
    except Exception as e:
        logger.error(f"Failed to parse resume: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Parsing error: {str(e)}"
        )

@router.post("/generate", response_model=ResumeJobResponse)
async def generate_resume(
    req: ResumeGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Triggers the multi-pass resume humanizer and ATS tailoring pipeline.
    Deducts 1 resume credit from user.
    """
    # 1. Deduct credit
    credit_ok = await deduct_resume_credit(current_user.id, db)
    if not credit_ok:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient resume credits. Please purchase more."
        )
        
    # 2. Create the Resume shell in database
    resume = Resume(
        user_id=current_user.id,
        title=req.title,
        template=req.template,
        color_theme=req.color_theme,
        job_description=req.job_description,
        raw_input=req.raw_input.model_dump(),
        final_resume=req.raw_input.model_dump()  # raw as fallback until pipeline finishes
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    
    # 3. Create ResumeJob record
    job = ResumeJob(
        user_id=current_user.id,
        resume_id=resume.id,
        status="pending",
        pass2_attempts=0
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    # 4. Dispatch to worker or run in-process background fallback
    user_input_dict = req.raw_input.model_dump()
    
    try:
        from backend.workers.celery_app import run_resume_pipeline_task
        run_resume_pipeline_task.delay(
            str(job.id),
            str(current_user.id),
            user_input_dict,
            req.template,
            req.color_theme,
            req.job_description or ""
        )
        logger.info(f"Dispatched Resume job {job.id} to Celery.")
    except Exception as e:
        logger.warning(f"Failed to submit to Celery ({e}). Running in-process background task.")
        from backend.pipeline.resume_orchestrator import compiled_resume_pipeline
        
        async def run_resume_pipeline_fallback():
            try:
                await compiled_resume_pipeline.ainvoke({
                    "job_id": str(job.id),
                    "user_id": str(current_user.id),
                    "user_input": user_input_dict,
                    "template": req.template,
                    "color_theme": req.color_theme,
                    "job_description": req.job_description or "",
                    "draft_resume": None,
                    "humanized_resume": None,
                    "ai_score": None,
                    "ats_score": None,
                    "final_resume": None,
                    "pass2_attempts": 0,
                    "status": "pending",
                    "error": None
                })
            except Exception as ex:
                logger.error(f"Fallback resume pipeline failed: {ex}")
                await restore_resume_credit(current_user.id, db)
                
        asyncio.create_task(run_resume_pipeline_fallback())
        
    return job

@router.get("", response_model=list[ResumeResponse])
async def list_resumes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lists all resumes created by the authenticated user."""
    stmt = select(Resume).where(Resume.user_id == current_user.id).order_by(Resume.created_at.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/{id}", response_model=ResumeResponse)
async def get_resume(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves a single resume configuration."""
    stmt = select(Resume).where(
        (Resume.id == id) & 
        (Resume.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    resume = res.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return resume

@router.put("/{id}", response_model=ResumeResponse)
async def update_resume(
    id: UUID,
    title: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Updates the title label of a saved resume."""
    stmt = select(Resume).where(
        (Resume.id == id) & 
        (Resume.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    resume = res.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
        
    resume.title = title
    await db.commit()
    await db.refresh(resume)
    return resume

@router.delete("/{id}")
async def delete_resume(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Deletes a saved resume from profile history."""
    stmt = delete(Resume).where(
        (Resume.id == id) & 
        (Resume.user_id == current_user.id)
    )
    await db.execute(stmt)
    await db.commit()
    return {"detail": "Resume successfully deleted."}

@router.post("/{id}/tailor", response_model=ResumeJobResponse)
async def tailor_resume(
    id: UUID,
    job_description: str,
    title: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a new resume variant tailored for a new Job Description.
    Deducts 1 resume credit.
    """
    # 1. Fetch parent resume
    stmt = select(Resume).where(
        (Resume.id == id) & 
        (Resume.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    parent = res.scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent resume not found.")
        
    # 2. Deduct credit
    credit_ok = await deduct_resume_credit(current_user.id, db)
    if not credit_ok:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient resume credits."
        )
        
    # 3. Create new resume variant
    variant_title = title or f"{parent.title} (Tailored)"
    resume = Resume(
        user_id=current_user.id,
        title=variant_title,
        template=parent.template,
        color_theme=parent.color_theme,
        job_description=job_description,
        raw_input=parent.raw_input,
        final_resume=parent.raw_input,  # start with parent as default
        version=parent.version + 1,
        parent_id=parent.id
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    
    # 4. Create ResumeJob record
    job = ResumeJob(
        user_id=current_user.id,
        resume_id=resume.id,
        status="pending"
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    # 5. Dispatch
    try:
        from backend.workers.celery_app import run_resume_pipeline_task
        run_resume_pipeline_task.delay(
            str(job.id),
            str(current_user.id),
            parent.raw_input,
            parent.template,
            parent.color_theme,
            job_description
        )
    except Exception as e:
        logger.warning(f"Celery failed during tailoring ({e}). Running in-process.")
        from backend.pipeline.resume_orchestrator import compiled_resume_pipeline
        
        async def run_tailor_fallback():
            try:
                await compiled_resume_pipeline.ainvoke({
                    "job_id": str(job.id),
                    "user_id": str(current_user.id),
                    "user_input": parent.raw_input,
                    "template": parent.template,
                    "color_theme": parent.color_theme,
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
            except Exception as ex:
                logger.error(f"Fallback resume tailoring failed: {ex}")
                await restore_resume_credit(current_user.id, db)
                
        asyncio.create_task(run_tailor_fallback())
        
    return job

@router.get("/{id}/export/pdf")
async def export_pdf(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Compiles resume data to HTML and serves the compiled PDF file binary stream."""
    stmt = select(Resume).where(
        (Resume.id == id) & 
        (Resume.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    resume = res.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
        
    try:
        # Generate the PDF binary on the fly
        pdf_data = await resume_renderer.render_pdf(
            resume.final_resume,
            resume.template,
            resume.color_theme
        )
        # Return PDF streaming response
        headers = {
            "Content-Disposition": f"attachment; filename=resume_{resume.title.replace(' ', '_')}.pdf"
        }
        return Response(content=pdf_data, media_type="application/pdf", headers=headers)
    except Exception as e:
        logger.error(f"Failed to generate PDF download stream for {id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to compile PDF resume file.")

@router.get("/{id}/export/docx")
async def export_docx(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Compiles resume to ATS-safe single-column Microsoft Word DOCX file binary stream."""
    # Pro features check
    if current_user.tier != "pro" and current_user.email != "demo@shipordie.ai":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Exporting to Word DOCX is a Pro feature. Please upgrade."
        )
        
    stmt = select(Resume).where(
        (Resume.id == id) & 
        (Resume.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    resume = res.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
        
    try:
        docx_data = await resume_renderer.render_docx(resume.final_resume)
        headers = {
            "Content-Disposition": f"attachment; filename=resume_{resume.title.replace(' ', '_')}.docx"
        }
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        return Response(content=docx_data, media_type=media_type, headers=headers)
    except Exception as e:
        logger.error(f"Failed to generate DOCX stream for {id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to compile Word DOCX file.")
