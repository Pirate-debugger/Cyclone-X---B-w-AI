import logging
import json
import time
from typing import Any, Dict
from datetime import datetime, timezone

class StructuredJsonFormatter(logging.Formatter):
    """Formats log records as structured JSON without exposing secrets."""
    
    SECRET_KEYS = {"key", "token", "secret", "password", "authorization", "api_key", "credentials"}

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # Add extra fields attached to the record
        if hasattr(record, "request_id"):
            log_obj["request_id"] = record.request_id
        if hasattr(record, "service"):
            log_obj["service"] = record.service
        if hasattr(record, "route"):
            log_obj["route"] = record.route
        if hasattr(record, "provider"):
            log_obj["provider"] = record.provider
        if hasattr(record, "duration_ms"):
            log_obj["duration_ms"] = record.duration_ms
        if hasattr(record, "status_code"):
            log_obj["status"] = record.status_code

        # Sanitize any accidental secret leakage
        return json.dumps(self._sanitize(log_obj))

    def _sanitize(self, obj: Any) -> Any:
        if isinstance(obj, dict):
            sanitized = {}
            for k, v in obj.items():
                if any(secret in k.lower() for secret in self.SECRET_KEYS):
                    sanitized[k] = "[REDACTED]"
                else:
                    sanitized[k] = self._sanitize(v)
            return sanitized
        elif isinstance(obj, list):
            return [self._sanitize(item) for item in obj]
        return obj

def setup_logger(name: str = "cyclonex") -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(StructuredJsonFormatter())
        logger.addHandler(handler)
        
    return logger

logger = setup_logger()
