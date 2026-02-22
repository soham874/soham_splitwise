import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    CONSUMER_KEY: str = os.getenv("CONSUMER_KEY", "")
    CONSUMER_SECRET: str = os.getenv("CONSUMER_SECRET", "")
    SECRET_KEY: str = os.getenv("SECRET_KEY", os.urandom(24).hex())
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8080"))
    FRONTEND_PORT: int = int(os.getenv("FRONTEND_PORT", "5173"))
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")


settings = Settings()
