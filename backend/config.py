import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "ShipOrDie API"
    DEBUG: bool = False
    
    # DB & Cache
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/shipordie"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Vector DB
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8002
    
    # LLM
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    GROQ_API_KEY: str = ""
    
    # Storage
    R2_BUCKET_NAME: str = ""
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    
    # Resume Builder defaults
    RESUME_AI_SCORE_THRESHOLD: float = 0.30
    RESUME_MAX_RETRIES: int = 3
    WEASYPRINT_ENABLED: bool = True

    # Razorpay Payments
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = "rzp_webhook_secret_placeholder"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
