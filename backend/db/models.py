import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column,
    String,
    Integer,
    Numeric,
    DateTime,
    ForeignKey,
    ARRAY,
    func
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    provider = Column(String, nullable=False)  # 'google' | 'github'
    tier = Column(String, default="free")  # 'free' | 'pro' | 'team'
    credits_remaining = Column(Integer, default=3)
    resume_credits_remaining = Column(Integer, default=1)  # Free tier: 1 resume/month
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    jobs = relationship("GenerationJob", back_populates="user")
    saved_ideas = relationship("SavedIdea", back_populates="user")
    resumes = relationship("Resume", back_populates="user")
    resume_jobs = relationship("ResumeJob", back_populates="user")
    subscription = relationship("Subscription", back_populates="user", uselist=False)

class GenerationJob(Base):
    __tablename__ = "generation_jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    status = Column(String, default="pending")  # 'pending' | 'running' | 'done' | 'failed'
    ideas_count = Column(Integer, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    user = relationship("User", back_populates="jobs")
    ideas = relationship("IdeaCard", back_populates="job")

class IdeaCard(Base):
    __tablename__ = "idea_cards"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("generation_jobs.id"))
    problem = Column(String, nullable=False)
    target_user = Column(String, nullable=False)
    solution = Column(String, nullable=False)
    stack = Column(ARRAY(String), nullable=False)
    build_time_weeks = Column(Integer, nullable=True)
    niche_score = Column(Numeric(3, 1), nullable=True)
    cluster_id = Column(String, nullable=True)
    raw_json = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    job = relationship("GenerationJob", back_populates="ideas")
    monetization_report = relationship("MonetizationReport", back_populates="idea", uselist=False)
    saved_by_users = relationship("SavedIdea", back_populates="idea")

class MonetizationReport(Base):
    __tablename__ = "monetization_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    idea_id = Column(UUID(as_uuid=True), ForeignKey("idea_cards.id"), unique=True)
    tam_estimate = Column(String, nullable=True)
    pricing_model = Column(String, nullable=True)  # "freemium" | "subscription" | "one-time" | "usage-based"
    price_range_usd = Column(String, nullable=True)
    price_range_inr = Column(String, nullable=True)
    competitors = Column(ARRAY(String), nullable=True)
    wtp_signal = Column(String, nullable=True)  # "strong" | "moderate" | "weak"
    distribution = Column(ARRAY(String), nullable=True)
    summary = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    idea = relationship("IdeaCard", back_populates="monetization_report")

class SavedIdea(Base):
    __tablename__ = "saved_ideas"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    idea_id = Column(UUID(as_uuid=True), ForeignKey("idea_cards.id"))
    notes = Column(String, nullable=True)
    saved_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="saved_ideas")
    idea = relationship("IdeaCard", back_populates="saved_by_users")

class Resume(Base):
    __tablename__ = "resumes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    title = Column(String, nullable=False)
    template = Column(String, nullable=False)
    color_theme = Column(String, default="default")
    job_description = Column(String, nullable=True)
    raw_input = Column(JSONB, nullable=False)
    final_resume = Column(JSONB, nullable=False)
    ai_score = Column(Numeric(4, 3), nullable=True)
    ats_score = Column(Numeric(4, 3), nullable=True)
    pdf_url = Column(String, nullable=True)
    docx_url = Column(String, nullable=True)
    version = Column(Integer, default=1)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("resumes.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="resumes")
    jobs = relationship("ResumeJob", back_populates="resume")

class ResumeJob(Base):
    __tablename__ = "resume_jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    resume_id = Column(UUID(as_uuid=True), ForeignKey("resumes.id"))
    status = Column(String, default="pending")  # pending | drafting | humanizing | scoring | ats | done | failed
    pass2_attempts = Column(Integer, default=0)
    final_ai_score = Column(Numeric(4, 3), nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    user = relationship("User", back_populates="resume_jobs")
    resume = relationship("Resume", back_populates="jobs")

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
    plan = Column(String, nullable=False)  # 'pro' | 'team'
    razorpay_subscription_id = Column(String, nullable=True)
    status = Column(String, default="active")
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="subscription")
