import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from backend.config import settings

logger = logging.getLogger(__name__)

# Fallback URL if postgresql URL is not provided or fails to initialize
database_url = settings.DATABASE_URL
if not database_url.startswith("postgresql"):
    logger.warning("DATABASE_URL does not specify PostgreSQL. Falling back to SQLite.")
    database_url = "sqlite+aiosqlite:///./shipordie.db"

# Create async engine with NullPool to avoid connection pooling issues in celery / async loop
engine = create_async_engine(
    database_url,
    poolclass=NullPool,
    echo=False
)

async_session = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession
)

async def get_db():
    """Dependency for getting async database sessions in FastAPI routes."""
    async with async_session() as session:
        try:
            yield session
        except Exception as e:
            logger.error(f"Database session exception: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db():
    """Initializes tables in database."""
    from backend.db.models import Base
    async with engine.begin() as conn:
        # For SQLite, clean up dialect difference if needed
        # Create all tables defined in models.py
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialized successfully.")
