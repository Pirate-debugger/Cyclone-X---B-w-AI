/**
 * GeoJSON Validation, Opacity Normalization, and XSS Sanitization Utilities
 * Compliance with CYCLONE-X Geospatial Engine Requirements.
 */

/**
 * Escapes raw strings before injecting into DOM or Popups.
 * Prevents HTML injection / XSS attacks.
 */
export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Normalizes opacity to a strict scalar float in [0.0, 1.0].
 * Fixes backend percentage values like 25 or 35 (converting to 0.25, 0.35)
 * and clamps to the valid MapLibre GL paint property range.
 */
export function normalizeOpacity(value: any, fallback = 0.35): number {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return fallback;
  }
  let num = Number(value);
  if (num > 1.0 && num <= 100.0) {
    num = num / 100.0;
  }
  return Math.max(0.0, Math.min(1.0, num));
}

/**
 * Validates a single [longitude, latitude] pair.
 * Longitude must be in [-180, 180] and latitude in [-90, 90].
 */
export function isValidLngLat(coord: any): boolean {
  if (!Array.isArray(coord) || coord.length < 2) return false;
  const [lng, lat] = coord;
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

/**
 * Validates geometry coordinates recursively based on geometry type.
 */
export function isValidGeometry(geom: any): boolean {
  if (!geom || typeof geom !== 'object') return false;
  const { type, coordinates } = geom;
  if (!type || !coordinates || !Array.isArray(coordinates)) return false;

  switch (type) {
    case 'Point':
      return isValidLngLat(coordinates);
    case 'MultiPoint':
    case 'LineString':
      return coordinates.length >= 2 && coordinates.every(isValidLngLat);
    case 'MultiLineString':
    case 'Polygon':
      return (
        coordinates.length > 0 &&
        coordinates.every(ring => Array.isArray(ring) && ring.length >= 3 && ring.every(isValidLngLat))
      );
    case 'MultiPolygon':
      return (
        coordinates.length > 0 &&
        coordinates.every(poly =>
          Array.isArray(poly) &&
          poly.length > 0 &&
          poly.every(ring => Array.isArray(ring) && ring.length >= 3 && ring.every(isValidLngLat))
        )
      );
    default:
      return false;
  }
}

/**
 * Cleans and validates a FeatureCollection or Feature.
 * Filters out broken features without discarding the entire dataset.
 * Normalizes any fill_opacity properties.
 */
export function validateAndCleanGeoJSON(data: any): any {
  if (!data || typeof data !== 'object') {
    return { type: 'FeatureCollection', features: [] };
  }

  if (data.type === 'Feature') {
    if (!isValidGeometry(data.geometry)) return { type: 'FeatureCollection', features: [] };
    const cleanProps = { ...(data.properties || {}) };
    if ('fill_opacity' in cleanProps) {
      cleanProps.fill_opacity = normalizeOpacity(cleanProps.fill_opacity);
    }
    return {
      type: 'FeatureCollection',
      features: [{ ...data, properties: cleanProps }]
    };
  }

  if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
    const validFeatures = data.features.filter((f: any) => {
      if (!f || f.type !== 'Feature') return false;
      return isValidGeometry(f.geometry);
    }).map((f: any) => {
      const cleanProps = { ...(f.properties || {}) };
      if ('fill_opacity' in cleanProps) {
        cleanProps.fill_opacity = normalizeOpacity(cleanProps.fill_opacity);
      }
      return { ...f, properties: cleanProps };
    });

    return {
      type: 'FeatureCollection',
      features: validFeatures
    };
  }

  return { type: 'FeatureCollection', features: [] };
}

/**
 * Extracts route coordinates in [lon, lat] format from backend response.
 * Priority:
 * 1. canonical route_geojson.geometry.coordinates
 * 2. route_geometry coordinates
 * 3. coordinates array
 * Returns null if no valid geometry is provided.
 */
export function extractRouteCoordinates(data: any): [number, number][] | null {
  if (!data) return null;

  // 1. Canonical route_geojson.geometry.coordinates
  if (data.route_geojson) {
    const geom = data.route_geojson.geometry || data.route_geojson;
    if (geom && Array.isArray(geom.coordinates) && geom.coordinates.length >= 2) {
      const coords = geom.coordinates.filter(isValidLngLat);
      if (coords.length >= 2) return coords as [number, number][];
    }
  }

  // 2. alternative_geojson
  if (data.alternative_geojson) {
    const geom = data.alternative_geojson.geometry || data.alternative_geojson;
    if (geom && Array.isArray(geom.coordinates) && geom.coordinates.length >= 2) {
      const coords = geom.coordinates.filter(isValidLngLat);
      if (coords.length >= 2) return coords as [number, number][];
    }
  }

  // 3. route_geometry fallback
  if (Array.isArray(data.route_geometry) && data.route_geometry.length >= 2) {
    const coords = data.route_geometry.filter(isValidLngLat);
    if (coords.length >= 2) return coords as [number, number][];
  }

  // 4. coordinates fallback
  if (Array.isArray(data.coordinates) && data.coordinates.length >= 2) {
    const coords = data.coordinates.filter(isValidLngLat);
    if (coords.length >= 2) return coords as [number, number][];
  }

  return null;
}
