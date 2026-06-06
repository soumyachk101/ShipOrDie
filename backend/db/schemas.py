from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

# --- User ---
class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    provider: str

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: UUID
    tier: str
    credits_remaining: int
    resume_credits_remaining: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Resume Creation & Data ---
class WorkExperienceItem(BaseModel):
    company: str
    title: str
    duration: str
    bullets: List[str]

class EducationItem(BaseModel):
    institution: str
    degree: str
    year: str
    gpa: Optional[str] = None

class SkillsSchema(BaseModel):
    technical: List[str]
    soft: List[str]

class ProjectItem(BaseModel):
    name: str
    description: str
    tech_stack: List[str]
    link: Optional[str] = None

class ResumeInputData(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    summary: Optional[str] = None
    experience: List[WorkExperienceItem]
    education: List[EducationItem]
    skills: SkillsSchema
    projects: List[ProjectItem]

class ResumeGenerateRequest(BaseModel):
    title: str
    template: str  # 'classic_ats' | 'modern_split' | 'tech_minimal' | 'creative_edge'
    color_theme: Optional[str] = "default"
    job_description: Optional[str] = None
    raw_input: ResumeInputData

class ResumeResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    template: str
    color_theme: str
    job_description: Optional[str]
    raw_input: Dict[str, Any]
    final_resume: Dict[str, Any]
    ai_score: Optional[float]
    ats_score: Optional[float]
    pdf_url: Optional[str]
    docx_url: Optional[str]
    version: int
    parent_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Jobs ---
class JobResponse(BaseModel):
    id: UUID
    user_id: UUID
    status: str
    duration_ms: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ResumeJobResponse(JobResponse):
    resume_id: UUID
    pass2_attempts: int
    final_ai_score: Optional[float] = None
