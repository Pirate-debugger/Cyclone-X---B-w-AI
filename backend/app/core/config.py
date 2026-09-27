import os
from pathlib import Path
from typing import Dict, Any, List
import yaml
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
CONFIG_DIR = BASE_DIR / "config"
DATA_DIR = BASE_DIR / "data"

class Settings(BaseSettings):
    APP_NAME: str = "CYCLONE-X"
    APP_VERSION: str = "2.0.0"
    APP_MODE: str = os.getenv("APP_MODE", "demo").lower()  # "demo" or "live"
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    # API & Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    CORS_ORIGINS: List[str] = ["*"]
    
    # Database & Cache
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./cyclonex.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # AI / Gemini
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.7-flash")
    
    # Earth Engine
    GOOGLE_CLOUD_PROJECT: str = os.getenv("GOOGLE_CLOUD_PROJECT", "")
    EARTH_ENGINE_PROJECT: str = os.getenv("EARTH_ENGINE_PROJECT", "")
    GOOGLE_APPLICATION_CREDENTIALS: str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    
    # WeatherNext 3 Enterprise NWP
    WEATHERNEXT3_ENABLED: bool = os.getenv("WEATHERNEXT3_ENABLED", "false").lower() in ("true", "1", "yes")
    WEATHERNEXT3_ACCESS_MODE: str = os.getenv("WEATHERNEXT3_ACCESS_MODE", "demo")
    WEATHERNEXT3_PROJECT: str = os.getenv("WEATHERNEXT3_PROJECT", "")
    WEATHERNEXT3_DATASET: str = os.getenv("WEATHERNEXT3_DATASET", "weathernext_3_operational")
    WEATHERNEXT_GCS_BUCKET: str = os.getenv("WEATHERNEXT_GCS_BUCKET", "")
    
    # WeatherNext Cyclones Dedicated Model
    CYCLONE_MODEL_PROVIDER: str = os.getenv("CYCLONE_MODEL_PROVIDER", "weathernext_cyclones")
    CYCLONE_MODEL_CHECKPOINT: str = os.getenv("CYCLONE_MODEL_CHECKPOINT", "weathernext_cyclones_v1_weights.pt")
    CYCLONE_MODEL_MODE: str = os.getenv("CYCLONE_MODEL_MODE", "demo")
    
    # Baseline Providers
    WEATHER_PROVIDER: str = os.getenv("WEATHER_PROVIDER", "open-meteo")
    OPEN_METEO_BASE_URL: str = os.getenv("OPEN_METEO_BASE_URL", "https://api.open-meteo.com/v1/forecast")
    ECMWF_ENABLED: bool = os.getenv("ECMWF_ENABLED", "true").lower() in ("true", "1", "yes")
    IBTRACS_ENABLED: bool = os.getenv("IBTRACS_ENABLED", "true").lower() in ("true", "1", "yes")
    INCOIS_ENABLED: bool = os.getenv("INCOIS_ENABLED", "false").lower() in ("true", "1", "yes")
    
    # Notification & Storage
    NOTIFICATION_PROVIDER: str = os.getenv("NOTIFICATION_PROVIDER", "dry_run")
    NOTIFICATION_API_KEY: str = os.getenv("NOTIFICATION_API_KEY", "")
    STORAGE_PROVIDER: str = os.getenv("STORAGE_PROVIDER", "filesystem")
    MAP_PROVIDER: str = os.getenv("MAP_PROVIDER", "carto-dark")
    MAP_API_KEY: str = os.getenv("MAP_API_KEY", "")
    
    # Paths
    RISK_CONFIG_PATH: Path = CONFIG_DIR / "risk_config.yaml"
    DEMO_DATA_PATH: Path = DATA_DIR / "demo"

    def load_risk_config(self) -> Dict[str, Any]:
        """Loads versioned risk and hazard thresholds from YAML configuration."""
        if not self.RISK_CONFIG_PATH.exists():
            return {
                "model_version": "CYCLONE-X Risk Engine v2.0",
                "risk_weights": {"hazard": 0.40, "exposure": 0.35, "vulnerability": 0.25},
                "hazard_weights": {"wind": 0.40, "rainfall": 0.30, "inundation": 0.30},
                "disclaimer": "Decision-support output — not an official government warning."
            }
        with open(self.RISK_CONFIG_PATH, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

settings = Settings()
