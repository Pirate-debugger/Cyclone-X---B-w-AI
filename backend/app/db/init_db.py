import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.orm import Session
from app.db.database import engine, Base, SessionLocal
from app.db.models import (
    EventModel,
    ForecastRunModel,
    ForecastMemberModel,
    InfrastructureAssetModel,
    AlertModel,
    DataSourceModel,
    AuditLogModel
)
from app.core.config import settings
from app.core.logging import logger
from app.providers.weathernext_provider import WeatherNext3Provider

def init_db():
    """Initializes the database schema and seeds verified baseline records."""
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema tables verified successfully.")

    db: Session = SessionLocal()
    try:
        # Check if events table has baseline
        existing_event = db.query(EventModel).filter(EventModel.id == "DEMO-TC-2026-ALPHA").first()
        if not existing_event:
            logger.info("Seeding primary baseline event: DEMO-TC-2026-ALPHA...")
            event = EventModel(
                id="DEMO-TC-2026-ALPHA",
                name="Cyclone Alpha (Bay of Bengal)",
                basin="North Indian Ocean (Bay of Bengal)",
                category="Extremely Severe Cyclonic Storm",
                status="ACTIVE",
                current_lat=16.8,
                current_lon=86.4,
                max_sustained_wind_kmh=155.0,
                central_pressure_hpa=965.0,
                movement_speed_kmh=14.0,
                movement_direction="NNW",
                classification="DEMO"
            )
            db.add(event)

            # Seed WeatherNext 3 64-member forecast run
            run_id = "RUN-WN3-20260927-00Z"
            f_run = ForecastRunModel(
                run_id=run_id,
                event_id="DEMO-TC-2026-ALPHA",
                model_name="WeatherNext 3 (64-member AI NWP)",
                model_version="v2.1",
                cycle="00Z",
                initialization_time=datetime.now(timezone.utc),
                source="Google DeepMind WeatherNext 3 API",
                status="COMPLETED",
                lead_hours_total=72
            )
            db.add(f_run)

            # Generate and seed 64 members
            wn3 = WeatherNext3Provider()
            members = wn3.generate_64_member_ensemble(base_lat=16.8, base_lon=86.4)
            for m in members:
                m_model = ForecastMemberModel(
                    run_id=run_id,
                    member_id=m.member_id,
                    lead_hours=m.lead_hours,
                    latitude=m.latitude,
                    longitude=m.longitude,
                    max_wind_kmh=m.max_wind_kmh,
                    central_pressure_hpa=m.central_pressure_hpa,
                    r34_km=m.r34_km or 120.0,
                    r50_km=m.r50_km or 60.0,
                    r64_km=m.r64_km or 30.0,
                    source=m.source,
                    classification=m.classification.value
                )
                db.add(m_model)

            # Seed Critical Infrastructure Assets from GeoJSON
            infra_path = settings.DEMO_DATA_PATH / "infrastructure.geojson"
            if infra_path.exists():
                with open(infra_path, "r", encoding="utf-8") as f:
                    infra_data = json.load(f)
                    for feat in infra_data.get("features", []):
                        props = feat.get("properties", {})
                        geom = feat.get("geometry", {})
                        coords = geom.get("coordinates", [85.8, 19.8])
                        lon = coords[0] if geom.get("type") == "Point" else coords[0][0]
                        lat = coords[1] if geom.get("type") == "Point" else coords[0][1]

                        asset = InfrastructureAssetModel(
                            id=props.get("id", f"INFRA-{uuid.uuid4().hex[:6]}"),
                            name=props.get("name", "Critical Lifeline Asset"),
                            type=props.get("type", "hospital"),
                            criticality=props.get("criticality", 80),
                            elevation_m=props.get("elevation_m", 5.0),
                            coastal_distance_km=props.get("distance_to_coast_km", 2.0),
                            backup_power=props.get("backup_power", "AVAILABLE"),
                            latitude=lat,
                            longitude=lon,
                            geometry_geojson=geom,
                            source="OpenStreetMap / HOTOSM"
                        )
                        db.add(asset)

            # Seed initial audit log
            audit = AuditLogModel(
                action="SYSTEM_INIT",
                user_id="sys_controller",
                username="system_initializer",
                role="admin",
                resource_id="cyclonex-db",
                details={"status": "PostGIS schema created, baseline ensemble seeded."}
            )
            db.add(audit)

            db.commit()
            logger.info("Database baseline seed complete.")
        else:
            logger.info("Database already seeded.")
    except Exception as e:
        db.rollback()
        logger.error(f"Database initialization error: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
