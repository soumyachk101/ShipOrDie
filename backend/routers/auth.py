import logging
import jwt
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
import httpx

from backend.db.session import get_db
from backend.db.models import User
from backend.db.schemas import UserResponse, UserCreate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# JWT config
JWT_SECRET = "shipordiesupersecretjwtkey"
JWT_ALGORITHM = "HS256"

class LoginRequest(BaseModel):
    email: EmailStr | None = None
    name: str | None = None
    avatar_url: str | None = None
    provider: str  # 'google' | 'github' | 'demo'
    token: str | None = None

def create_jwt_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(
    authorization: str | None = Header(None), 
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency to get the currently authenticated user.
    If no authorization header is found, falls back to a seeded Demo User.
    """
    demo_email = "demo@shipordie.ai"
    
    # 1. Parse authorization token if present
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                stmt = select(User).where(User.id == UUID(user_id))
                res = await db.execute(stmt)
                user = res.scalar_one_or_none()
                if user:
                    return user
        except Exception as e:
            logger.warning(f"Failed to decode token ({e}). Falling back to demo user.")

    # 2. Seeding / returning Demo User for seamless developer experience
    stmt = select(User).where(User.email == demo_email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    
    if not user:
        logger.info("Demo user not found. Seeding new Demo User.")
        user = User(
            email=demo_email,
            name="Demo Founder",
            avatar_url="https://api.dicebear.com/7.x/bottts/svg?seed=demo",
            provider="demo",
            tier="free",
            credits_remaining=3,
            resume_credits_remaining=1
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    return user

@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Logs in an OAuth authenticated user or registers them if new."""
    email = req.email
    name = req.name
    avatar_url = req.avatar_url

    if req.provider == "google" and req.token:
        logger.info("Verifying Google access token...")
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {req.token}"}
                )
                if res.status_code != 200:
                    logger.error(f"Google userinfo response error: {res.text}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid Google access token."
                    )
                google_user = res.json()
                email = google_user.get("email")
                name = google_user.get("name")
                avatar_url = google_user.get("picture")
        except Exception as e:
            logger.error(f"Google token verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google token verification failed."
            )

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required for authentication."
        )

    logger.info(f"Login request for email {email} via {req.provider}")
    
    stmt = select(User).where(User.email == email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    
    if not user:
        logger.info(f"User {email} not found. Registering new profile.")
        # Free tier gets 3 idea credits and 1 resume credit
        user = User(
            email=email,
            name=name,
            avatar_url=avatar_url,
            provider=req.provider,
            tier="free",
            credits_remaining=3,
            resume_credits_remaining=1
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    token = create_jwt_token(str(user.id))
    return {
        "token": token,
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "avatar_url": user.avatar_url,
            "tier": user.tier,
            "credits_remaining": user.credits_remaining,
            "resume_credits_remaining": user.resume_credits_remaining
        }
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Returns the current authenticated user's profile."""
    return current_user

@router.post("/logout")
async def logout():
    """Dummy endpoint to match schema requirements."""
    return {"detail": "Successfully logged out."}
