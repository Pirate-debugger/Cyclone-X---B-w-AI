import json
from datetime import datetime, timezone
from typing import Any, Dict
import httpx
from app.core.config import settings
from app.core.logging import logger
from app.models.schemas import Alert
from app.providers.base import NotificationProvider

class DryRunNotificationProvider(NotificationProvider):
    """Default safety provider: simulates transmission without external messaging."""
    
    async def send_alert(self, alert: Alert) -> Dict[str, Any]:
        logger.info(f"[DRY RUN AUDIT] Alert {alert.id} ({alert.title}) approved and sent to DRY_RUN channel.")
        return {
            "status": "DELIVERED_DRY_RUN",
            "provider": "DryRunNotificationProvider",
            "alert_id": alert.id,
            "dispatched_at": datetime.now(timezone.utc).isoformat(),
            "target_area": alert.target_area,
            "urgency": alert.urgency,
            "notes": "Safe sandbox dispatch — no external citizens or third parties contacted."
        }


class WebhookNotificationProvider(NotificationProvider):
    """Dispatches approved alert payload to an emergency operating center webhook."""
    
    def __init__(self, webhook_url: str):
        self.webhook_url = webhook_url

    async def send_alert(self, alert: Alert) -> Dict[str, Any]:
        payload = {
            "cyclonex_alert_id": alert.id,
            "event_id": alert.event_id,
            "title": alert.title,
            "urgency": alert.urgency,
            "status": alert.status,
            "disclaimer": alert.disclaimer,
            "target_area": alert.target_area,
            "translations": {lang: t.dict() for lang, t in alert.translations.items()},
            "dispatched_at": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(self.webhook_url, json=payload)
                res.raise_for_status()
            return {
                "status": "DELIVERED_WEBHOOK",
                "provider": "WebhookNotificationProvider",
                "alert_id": alert.id,
                "http_status": res.status_code
            }
        except Exception as e:
            logger.error(f"Webhook dispatch failed: {str(e)}")
            return {
                "status": "FAILED",
                "provider": "WebhookNotificationProvider",
                "error": str(e)
            }
