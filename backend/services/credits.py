import logging
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.db.models import User

logger = logging.getLogger(__name__)

async def deduct_credit(user_id: UUID, db: AsyncSession) -> bool:
    """
    Atomically deduct 1 idea credit. Returns False if insufficient credits.
    Pro tier users have unlimited credits and always return True.
    """
    try:
        # Select for update to ensure atomic isolation
        stmt = select(User).where(User.id == user_id).with_for_update()
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            logger.error(f"User {user_id} not found during credit deduction.")
            return False
            
        if user.tier == "pro":
            return True
            
        if user.credits_remaining <= 0:
            logger.warning(f"User {user_id} has insufficient credits: {user.credits_remaining}")
            return False
            
        user.credits_remaining -= 1
        await db.commit()
        logger.info(f"Deducted 1 credit from user {user_id}. Remaining: {user.credits_remaining}")
        return True
    except Exception as e:
        logger.error(f"Error deducting credit for user {user_id}: {e}")
        await db.rollback()
        return False

async def restore_credit(user_id: UUID, db: AsyncSession) -> None:
    """
    Restores 1 idea credit if the pipeline failed.
    Pro users do not require restoration.
    """
    try:
        stmt = select(User).where(User.id == user_id).with_for_update()
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            logger.error(f"User {user_id} not found during credit restoration.")
            return
            
        if user.tier != "pro":
            user.credits_remaining += 1
            await db.commit()
            logger.info(f"Restored 1 credit to user {user_id}. New balance: {user.credits_remaining}")
    except Exception as e:
        logger.error(f"Error restoring credit for user {user_id}: {e}")
        await db.rollback()

async def deduct_resume_credit(user_id: UUID, db: AsyncSession) -> bool:
    """
    Atomically deduct 1 resume credit. Returns False if insufficient credits.
    Both Free and Pro users have fixed limits of resume generation credits.
    """
    try:
        stmt = select(User).where(User.id == user_id).with_for_update()
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            logger.error(f"User {user_id} not found during resume credit deduction.")
            return False
            
        if user.resume_credits_remaining <= 0:
            logger.warning(f"User {user_id} has insufficient resume credits.")
            return False
            
        user.resume_credits_remaining -= 1
        await db.commit()
        logger.info(f"Deducted 1 resume credit from user {user_id}. Remaining: {user.resume_credits_remaining}")
        return True
    except Exception as e:
        logger.error(f"Error deducting resume credit for user {user_id}: {e}")
        await db.rollback()
        return False

async def restore_resume_credit(user_id: UUID, db: AsyncSession) -> None:
    """
    Restores 1 resume credit if the pipeline failed.
    """
    try:
        stmt = select(User).where(User.id == user_id).with_for_update()
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            logger.error(f"User {user_id} not found during resume credit restoration.")
            return
            
        user.resume_credits_remaining += 1
        await db.commit()
        logger.info(f"Restored 1 resume credit to user {user_id}. New balance: {user.resume_credits_remaining}")
    except Exception as e:
        logger.error(f"Error restoring resume credit for user {user_id}: {e}")
        await db.rollback()
