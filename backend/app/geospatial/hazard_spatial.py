import math
from typing import Tuple, List
from shapely.geometry import Point, LineString

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def calculate_radial_wind_speed(
    point_lat: float,
    point_lon: float,
    cyclone_lat: float,
    cyclone_lon: float,
    v_max_kmh: float,
    r_max_km: float = 35.0,
    decay_exponent: float = 0.55
) -> float:
    """Calculates modeled wind speed at a point using Modified Rankine Vortex."""
    dist_km = haversine_distance_km(point_lat, point_lon, cyclone_lat, cyclone_lon)
    if dist_km <= 0.1:
        return v_max_kmh * 0.2  # Eye of the cyclone
    elif dist_km <= r_max_km:
        return v_max_kmh * (dist_km / r_max_km)
    else:
        decay = (r_max_km / dist_km) ** decay_exponent
        return v_max_kmh * decay

def calculate_radial_rainfall_mm(
    point_lat: float,
    point_lon: float,
    cyclone_lat: float,
    cyclone_lon: float,
    peak_rainfall_mm: float = 220.0,
    rain_radius_km: float = 90.0
) -> float:
    """Calculates modeled 24-hr cumulative precipitation with exponential decay."""
    dist_km = haversine_distance_km(point_lat, point_lon, cyclone_lat, cyclone_lon)
    rainfall = peak_rainfall_mm * math.exp(-0.5 * (dist_km / rain_radius_km) ** 1.4)
    return max(0.0, rainfall)

def calculate_surge_inundation_depth(
    elevation_m: float,
    distance_to_coast_km: float,
    scenario_surge_m: float = 2.2,
    coastal_attenuation_km: float = 12.0
) -> float:
    """Calculates modeled inundation depth proxy based on elevation and coastal distance."""
    if distance_to_coast_km > 25.0:
        return 0.0
    
    # Distance attenuation factor (exponential decay inland)
    attenuation = math.exp(-distance_to_coast_km / coastal_attenuation_km)
    effective_surge_height = scenario_surge_m * attenuation
    
    # Inundation occurs if water level exceeds local elevation
    depth = effective_surge_height - elevation_m
    return max(0.0, depth)
