# Load backend/.env for local development before any module reads os.getenv.
# Variables already set in the real environment win, so hosted deployments are
# configured by the platform and ignore this file.
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ModuleNotFoundError:  # python-dotenv is optional in production
    pass
