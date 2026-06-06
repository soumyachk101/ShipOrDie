import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update

from backend.db.session import get_db
from backend.db.models import User, Subscription
from backend.routers.auth import get_current_user
from backend.services.razorpay import razorpay_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/billing", tags=["billing"])

@router.post("/checkout")
async def create_checkout(
    plan: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Creates a payment subscription checkout session."""
    if plan not in ["pro", "team"]:
        raise HTTPException(status_code=400, detail="Invalid subscription plan.")
        
    session_data = await razorpay_service.create_checkout_session(str(current_user.id), plan)
    return session_data

@router.post("/webhook")
async def billing_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Verifies signature and processes payment events from Razorpay."""
    payload = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    
    verified = razorpay_service.verify_webhook_signature(payload, signature)
    if not verified:
        raise HTTPException(status_code=400, detail="Invalid signature.")
        
    try:
        data = await request.json()
        event = data.get("event")
        # Handle subscription activation/deactivation
        logger.info(f"Received billing webhook event: {event}")
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error parsing billing webhook payload: {e}")
        return {"status": "error"}

@router.get("/status")
async def get_billing_status(current_user: User = Depends(get_current_user)):
    """Returns the subscription status for the current user."""
    return {
        "tier": current_user.tier,
        "credits_remaining": current_user.credits_remaining,
        "resume_credits_remaining": current_user.resume_credits_remaining
    }

@router.delete("/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancels user's active subscription, returning them to the Free tier."""
    async with db.begin():
        # Select user
        stmt = update(User).where(User.id == current_user.id).values(
            tier="free",
            credits_remaining=3,
            resume_credits_remaining=1
        )
        await db.execute(stmt)
    logger.info(f"Cancelled subscription for user {current_user.id}.")
    return {"detail": "Subscription successfully cancelled."}

@router.post("/upgrade-demo")
async def upgrade_demo_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Developer helper: immediately upgrades current user to Pro tier with 10 resume credits."""
    current_user.tier = "pro"
    current_user.credits_remaining = 9999
    current_user.resume_credits_remaining = 10
    
    db.add(current_user)
    await db.commit()
    logger.info(f"User {current_user.id} upgraded to PRO tier via demo upgrade route.")
    return {
        "detail": "Successfully upgraded to PRO tier.",
        "user": {
            "tier": current_user.tier,
            "credits_remaining": current_user.credits_remaining,
            "resume_credits_remaining": current_user.resume_credits_remaining
        }
    }
