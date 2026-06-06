import os
import sys

# Add parent directory of 'backend' to sys.path to resolve 'backend.*' imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import logging
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from backend.config import settings
from backend.db.session import init_db
from backend.routers import auth, ideas, jobs, resume, billing

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("shipordie")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for ShipOrDie Idea Engine and Resume Builder",
    version="2.0",
    docs_url="/docs"
)

# CORS Configuration
# Allow local development Next.js dev server origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all for quick connections
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Include Routers
app.include_router(auth.router)
app.include_router(ideas.router)
app.include_router(jobs.router)
app.include_router(resume.router)
app.include_router(billing.router)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up ShipOrDie API server...")
    
    # 1. Initialize Database Tables
    try:
        await init_db()
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        
    # 2. Pre-verify local NLTK downloading
    try:
        import nltk
        nltk.download('punkt', quiet=True)
        nltk.download('punkt_tab', quiet=True)
        logger.info("NLTK download verified.")
    except Exception as e:
        logger.warning(f"Failed to verify NLTK downloads: {e}")

@app.get("/health")
async def health_check():
    """Simple endpoint to verify server status."""
    return {"status": "healthy", "service": "shipordie-api"}

@app.get("/api/exports/download/{filename}")
async def download_exported_file(filename: str):
    """Serves locally cached PDF/DOCX files if R2 is not configured."""
    local_path = os.path.join("./exports", filename)
    if os.path.exists(local_path):
        # Infer content type based on extension
        ext = filename.split(".")[-1].lower()
        media_type = "application/pdf" if ext == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        
        headers = {
            "Content-Disposition": f"attachment; filename={filename}"
        }
        return FileResponse(local_path, media_type=media_type, headers=headers)
        
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Requested file export was not found or has expired."
    )

if __name__ == "__main__":
    import uvicorn
    logger.info("Running uvicorn server direct launch...")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
