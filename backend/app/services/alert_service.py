import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.core.logging import logger
from app.models.schemas import Alert, AlertTranslation, AlertDraftRequest
from app.providers.notification_provider import DryRunNotificationProvider

class AlertService:
    """Manages the full human-in-the-loop alert lifecycle: DRAFT -> REVIEW -> APPROVE -> SEND."""

    def __init__(self, demo_dir: Path = settings.DEMO_DATA_PATH):
        self.demo_dir = demo_dir
        self.notification_provider = DryRunNotificationProvider()
        self._alerts: List[Alert] = []
        self._load_demo_alerts()

    def _load_demo_alerts(self):
        alert_file = self.demo_dir / "alerts_demo.json"
        if not alert_file.exists():
            return
        with open(alert_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        self._alerts = [Alert(**item) for item in data]

    def get_all_alerts(self) -> List[Alert]:
        return self._alerts

    def create_draft(self, request: AlertDraftRequest, author: str = "Operator (SEOC Desk)") -> Alert:
        """Creates a new advisory draft requiring human review."""
        alert_id = f"ALT-{uuid.uuid4().hex[:6].upper()}"
        
        # Multilingual translations (grounded in English advisory)
        base_body = (
            f"Advisory regarding {request.event_id} for target area: {request.target_area}. "
            f"Threat level: {request.urgency}. Recommended action: {request.action_notes}. "
            "Decision-support output — not an official government warning."
        )

        translations = {
            "en": AlertTranslation(title=request.title, body=base_body),
            "hi": AlertTranslation(
                title=f"चेतावनी: {request.title}",
                body=f"{request.event_id} हेतु सतर्कता परामर्श। लक्षित क्षेत्र: {request.target_area}। तात्कालिकता: {request.urgency}। अनुशंसित कार्रवाई: {request.action_notes}।"
            ),
            "or": AlertTranslation(
                title=f"ପରାମର୍ଶ: {request.title}",
                body=f"{request.event_id} ପାଇଁ ସତର୍କତା ସୂଚନା। କ୍ଷେତ୍ର: {request.target_area}। କାର୍ଯ୍ୟାନୁଷ୍ଠାନ: {request.action_notes}।"
            ),
            "te": AlertTranslation(
                title=f"హెచ్చరిక: {request.title}",
                body=f"{request.event_id} కొరకు ముందస్తు సమాచారం. ప్రాంతం: {request.target_area}. చర్యలు: {request.action_notes}."
            ),
            "bn": AlertTranslation(
                title=f"সতর্কবার্তা: {request.title}",
                body=f"{request.event_id} সম্পর্কিত জরুরি পরামর্শ। অঞ্চল: {request.target_area}। প্রস্তাবিত পদক্ষেপ: {request.action_notes}।"
            )
        }

        now_str = datetime.now(timezone.utc).isoformat()
        new_alert = Alert(
            id=alert_id,
            event_id=request.event_id,
            type=request.type,
            title=request.title,
            urgency=request.urgency,
            status="DRAFT",
            workflow_step="REVIEW",
            created_at=now_str,
            author=author,
            target_area=request.target_area,
            translations=translations,
            delivery_channel="DRY_RUN",
            delivery_status="AWAITING_REVIEW",
            audit_trail=[
                {"action": "DRAFT_CREATED", "user": author, "timestamp": now_str}
            ]
        )
        self._alerts.insert(0, new_alert)
        return new_alert

    def approve_alert(self, alert_id: str, reviewer: str = "Authorized Reviewer") -> Optional[Alert]:
        """Advances alert to APPROVED status."""
        for alert in self._alerts:
            if alert.id == alert_id:
                now_str = datetime.now(timezone.utc).isoformat()
                alert.status = "APPROVED"
                alert.workflow_step = "APPROVE"
                alert.reviewer = reviewer
                alert.approved_at = now_str
                alert.delivery_status = "READY_FOR_DISPATCH"
                alert.audit_trail.append(
                    {"action": "APPROVED", "user": reviewer, "timestamp": now_str}
                )
                return alert
        return None

    async def send_alert(self, alert_id: str, dispatcher: str = "Authorized Dispatcher") -> Optional[Dict[str, Any]]:
        """Dispatches an approved alert through configured provider (defaults to DRY_RUN)."""
        for alert in self._alerts:
            if alert.id == alert_id:
                if alert.status != "APPROVED":
                    raise ValueError(f"Alert {alert_id} must be in APPROVED status before sending. Current status: {alert.status}")
                
                result = await self.notification_provider.send_alert(alert)
                now_str = datetime.now(timezone.utc).isoformat()
                alert.status = "SENT"
                alert.workflow_step = "SEND"
                alert.delivery_status = result.get("status", "DELIVERED")
                alert.audit_trail.append(
                    {"action": "SENT", "user": dispatcher, "timestamp": now_str, "result": result.get("status")}
                )
                return result
        return None
