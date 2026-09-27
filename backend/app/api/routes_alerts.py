from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.models.schemas import APIResponse, ResponseMeta, DataClassification, AlertDraftRequest
from app.services.alert_service import AlertService
from app.core.security import require_role, UserRole, CurrentUser, get_current_user

router = APIRouter(prefix="/alerts", tags=["Advisories & Alerts"])

alert_service = AlertService()

class ApproveAlertRequest(BaseModel):
    alert_id: str
    reviewer_notes: Optional[str] = None

class SendAlertRequest(BaseModel):
    alert_id: str

@router.get("")
async def get_alerts():
    """Returns all advisories and alerts with workflow state and multilingual translations."""
    alerts = alert_service.get_all_alerts()
    return APIResponse(
        data=alerts,
        meta=ResponseMeta(
            source="Disaster Management Advisory Center",
            data_classification=DataClassification.MODEL_OUTPUT
        )
    )

@router.post("/draft")
async def draft_alert(
    request: AlertDraftRequest,
    current_user: CurrentUser = Depends(require_role(UserRole.OPERATOR))
):
    """Creates a new human-reviewable advisory draft."""
    draft = alert_service.create_draft(request, author=current_user.username)
    return APIResponse(
        data=draft,
        meta=ResponseMeta(source="Advisory Drafting Workflow")
    )

@router.post("/approve")
async def approve_alert(
    request: ApproveAlertRequest,
    current_user: CurrentUser = Depends(require_role(UserRole.OPERATOR))
):
    """Advances draft advisory to APPROVED status following supervisor review."""
    approved = alert_service.approve_alert(request.alert_id, reviewer=current_user.username)
    if not approved:
        raise HTTPException(status_code=404, detail=f"Alert '{request.alert_id}' not found")
        
    return APIResponse(
        data=approved,
        meta=ResponseMeta(source="Advisory Approval Workflow")
    )

@router.post("/send")
async def send_alert(
    request: SendAlertRequest,
    current_user: CurrentUser = Depends(require_role(UserRole.OPERATOR))
):
    """Dispatches approved alert through configured provider (safe DRY RUN by default)."""
    try:
        result = await alert_service.send_alert(request.alert_id, dispatcher=current_user.username)
        if not result:
            raise HTTPException(status_code=404, detail=f"Alert '{request.alert_id}' not found")
        return APIResponse(
            data=result,
            meta=ResponseMeta(source="Emergency Dispatch Pipeline")
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
