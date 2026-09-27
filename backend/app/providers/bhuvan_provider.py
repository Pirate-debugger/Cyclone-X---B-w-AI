from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.core.config import settings

class BhuvanProvider:
    """
    ISRO / Bhuvan Indian Geospatial & Disaster Platform Adapter.
    Section 28 Requirements:
    - Provides official metadata and access endpoints for Indian disaster datasets
    - Fields: source, dataset, date, coverage, resolution, license/usage notes
    - Strictly compliant: Never scrapes unauthorized endpoints.
    """

    OFFICIAL_DATASETS = [
        {
            "dataset_id": "bhuvan-cyclone-inundation",
            "name": "Bhuvan Post-Cyclone Coastal Inundation & Land Surface Water",
            "agency": "National Remote Sensing Centre (NRSC) / ISRO",
            "source": "ISRO Disaster Management Support Programme (DMSP)",
            "satellite_sensors": ["RISAT-1A SAR (EOS-04)", "Resourcesat-2A AWiFS / LISS-IV"],
            "coverage": "Coastal Odisha, Andhra Pradesh, West Bengal",
            "spatial_resolution": "5.8m (LISS-IV) / 25m (SAR)",
            "temporal_resolution": "Event-driven emergency tasking",
            "date": "2026-09-27",
            "status": "CATALOGUED",
            "license": "Government of India Open Data / Disaster Emergency Relief Access",
            "url": "https://bhuvan-app1.nrsc.gov.in/disaster/disaster.php",
            "usage_notes": "Official Indian space-borne emergency flood inundation layers provided under NDMA/SDMA tasking protocol."
        },
        {
            "dataset_id": "bhuvan-dem-cartosat",
            "name": "CartoDEM Version-3R1 Coastal Topography",
            "agency": "ISRO / NRSC",
            "source": "Cartosat-1 Stereo Imagery",
            "coverage": "Indian Subcontinent Coastline",
            "spatial_resolution": "30m (Post-processed for coastal zone)",
            "date": "2024-01-15",
            "status": "ACCESSIBLE",
            "license": "Open Data Policy for Bhuvan Users",
            "url": "https://bhuvan.nrsc.gov.in/dem",
            "usage_notes": "High-accuracy national coastal elevation model used for storm surge backwater runup verification."
        },
        {
            "dataset_id": "bhuvan-lulc-50k",
            "name": "National Land Use / Land Cover (LULC 50k)",
            "agency": "NRSC / ISRO",
            "source": "Resourcesat-2 LISS-III",
            "coverage": "National (Coastal Districts Focus)",
            "spatial_resolution": "24m",
            "date": "2023-08-30",
            "status": "ACCESSIBLE",
            "license": "National Spatial Data Infrastructure (NSDI) India",
            "url": "https://bhuvan.nrsc.gov.in/thematic",
            "usage_notes": "Ground-truth land cover taxonomy for roughness and surface friction coefficient calculations."
        }
    ]

    def __init__(self):
        self.enabled = settings.BHUVAN_ENABLED

    def get_datasets(self) -> List[Dict[str, Any]]:
        """Returns catalogue of authorized Indian space-borne disaster datasets."""
        return self.OFFICIAL_DATASETS

    def get_dataset_by_id(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        for ds in self.OFFICIAL_DATASETS:
            if ds["dataset_id"] == dataset_id:
                return ds
        return None
