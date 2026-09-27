from fastapi import APIRouter
from app.models.schemas import (
    APIResponse,
    ResponseMeta,
    DataClassification,
    AICopilotRequest,
    SatelliteImageAnalysisRequest
)
from app.services.gemini_service import GeminiService
from app.api.routes_risk import load_precomputed_risk

router = APIRouter(prefix="/ai", tags=["Gemini AI Copilot"])

gemini_service = GeminiService()

@router.post("/explain")
async def explain_risk(request: AICopilotRequest):
    """Uses Gemini multimodal reasoning to explain model-derived risk using structured backend evidence."""
    # Gather evidence from precomputed and live models
    evidence = load_precomputed_risk()
    
    explanation = await gemini_service.explain_risk(request, evidence)
    return APIResponse(
        data=explanation,
        meta=ResponseMeta(
            source=f"Gemini Copilot ({explanation.ai_status})",
            confidence=float(explanation.confidence),
            data_classification=DataClassification.AI_INTERPRETATION,
            disclaimer="AI reasoning assistance grounded in backend model outputs — not an official government directive."
        )
    )

@router.post("/analyze-image")
async def analyze_satellite_image(request: SatelliteImageAnalysisRequest):
    """Analyzes satellite observations distinguishing OBSERVED, POSSIBLE, and UNKNOWN features."""
    analysis = await gemini_service.analyze_satellite_image(request)
    return APIResponse(
        data=analysis,
        meta=ResponseMeta(
            source="Gemini Earth Observation Vision Module",
            data_classification=DataClassification.AI_INTERPRETATION
        )
    )
