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

    # MySQL
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "127.0.0.1")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DATABASE: str = os.getenv("MYSQL_DATABASE", "splitwise_manager")


settings = Settings()
