import math
from typing import List, Dict, Any, Tuple
from shapely.geometry import box, Polygon, mapping

def generate_spatial_grid(
    min_lat: float = 19.5,
    min_lon: float = 85.5,
    max_lat: float = 20.6,
    max_lon: float = 87.0,
    cell_size_deg: float = 0.04  # roughly ~4.4 km grid cells for performance
) -> List[Dict[str, Any]]:
    """Generates a uniform rectangular spatial grid across the target coastal area."""
    grid_cells: List[Dict[str, Any]] = []
    
    lat_steps = int(math.ceil((max_lat - min_lat) / cell_size_deg))
    lon_steps = int(math.ceil((max_lon - min_lon) / cell_size_deg))
    
    cell_idx = 1
    for i in range(lat_steps):
        cell_min_lat = min_lat + i * cell_size_deg
        cell_max_lat = min_lat + (i + 1) * cell_size_deg
        
        for j in range(lon_steps):
            cell_min_lon = min_lon + j * cell_size_deg
            cell_max_lon = min_lon + (j + 1) * cell_size_deg
            
            centroid_lat = (cell_min_lat + cell_max_lat) / 2.0
            centroid_lon = (cell_min_lon + cell_max_lon) / 2.0
            
            poly = box(cell_min_lon, cell_min_lat, cell_max_lon, cell_max_lat)
            
            grid_cells.append({
                "cell_id": f"GRID-{cell_idx:04d}",
                "min_lat": cell_min_lat,
                "max_lat": cell_max_lat,
                "min_lon": cell_min_lon,
                "max_lon": cell_max_lon,
                "centroid": (centroid_lat, centroid_lon),
                "geometry": mapping(poly),
                "poly": poly
            })
            cell_idx += 1
            
    return grid_cells
