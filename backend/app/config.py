# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_service_role_key: str
    
    # AI Providers
    openrouter_api_key: str
    google_api_key: str = ""
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    
    # App
    environment: str = "development"
    allowed_origins: str = "http://localhost:3000"
    secret_key: str
    
    # Rate Limiting
    rate_limit_per_minute: int = 20
    rate_limit_tokens_per_minute: int = 100000
    
    # Billing
    default_markup_rate: float = 1.20
    min_balance_threshold: float = 0.0001
    
    # Monitoring
    sentry_dsn: str = ""
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
