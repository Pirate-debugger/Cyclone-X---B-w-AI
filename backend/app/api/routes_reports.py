from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Response, Query
from pydantic import BaseModel
from app.models.schemas import APIResponse, ResponseMeta, DataClassification, IncidentReport, HotspotZone
from app.services.report_service import ReportService
from app.services.risk_engine import RiskEngine
from app.services.exposure_engine import ExposureEngine
from app.providers.infrastructure_provider import GeoJSONInfrastructureProvider
from app.api.routes_risk import load_precomputed_risk

router = APIRouter(prefix="/reports", tags=["Incident Reports"])

report_service = ReportService()
risk_engine = RiskEngine()
exposure_engine = ExposureEngine()
infra_provider = GeoJSONInfrastructureProvider()

_report_store: Dict[str, IncidentReport] = {}

class GenerateReportRequest(BaseModel):
    event_id: str = "DEMO-TC-2026-ALPHA"

@router.post("/generate")
async def generate_incident_report(request: GenerateReportRequest):
    """Synthesizes all current models, hazards, and infrastructure into an official Incident Brief."""
    precomputed = load_precomputed_risk()
    hotspots = [HotspotZone(**h) for h in precomputed.get("top_priority_zones", [])]
    assets = await infra_provider.get_all_assets()
    infra_assessments = risk_engine.assess_infrastructure_risk(assets)
    pop_exposure = exposure_engine.estimate_population_exposure(82)

    report = report_service.build_incident_report(
        event_id=request.event_id,
        overall_risk=precomputed.get("overall_metrics", {}).get("overall_risk_score", 82),
        hazard_score=precomputed.get("overall_metrics", {}).get("hazard_score", 86),
        hotspots=hotspots,
        infrastructure=infra_assessments,
        population_exposure=pop_exposure
    )

    _report_store[report.report_id] = report
    return APIResponse(
        data=report,
        meta=ResponseMeta(
            source="CYCLONE-X Automated Incident Reporting Pipeline",
            data_classification=DataClassification.MODEL_OUTPUT
        )
    )

@router.get("/{report_id}")
async def get_report(report_id: str):
    """Retrieves an existing Incident Report by ID."""
    if report_id not in _report_store:
        # Generate on the fly if needed
        req = GenerateReportRequest()
        res = await generate_incident_report(req)
        return res
        
    return APIResponse(
        data=_report_store[report_id],
        meta=ResponseMeta(source="Report Archive")
    )

@router.get("/{report_id}/export")
async def export_report(
    report_id: str,
    format: str = Query("pdf", description="Export format: pdf, csv, json")
):
    """Downloads Incident Report as publication-ready PDF, CSV, or JSON."""
    report = _report_store.get(report_id)
    if not report:
        req = GenerateReportRequest()
        await generate_incident_report(req)
        report = list(_report_store.values())[-1]

    if format.lower() == "pdf":
        pdf_bytes = report_service.export_pdf(report)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={report.report_id}.pdf"}
        )
    elif format.lower() == "csv":
        csv_text = report_service.export_csv(report)
        return Response(
            content=csv_text,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={report.report_id}.csv"}
        )
    else:
        return APIResponse(data=report)
