import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./candidate_comms.db")

# Hosted Postgres providers hand out "postgres://" or "postgresql://" URLs.
# SQLAlchemy needs an explicit driver, so normalise them onto psycopg 3.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

if DATABASE_URL.startswith("sqlite"):
    # SQLite connections are used from FastAPI's worker threads.
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Serverless Postgres such as Neon closes idle connections and suspends the
    # compute, so pooled connections are checked before use and recycled often.
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=5,
    )

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
