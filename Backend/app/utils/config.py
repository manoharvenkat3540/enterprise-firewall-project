import os
from pathlib import Path
from dotenv import load_dotenv

# Locate the Backend directory
BACKEND_DIR = Path(__file__).resolve().parents[2]

# Locate Backend/.env
ENV_FILE = BACKEND_DIR / ".env"

# Load environment variables
load_dotenv(dotenv_path=ENV_FILE, override=True)

# Read Groq configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    "openai/gpt-oss-120b",
)