import assert from 'node:assert';
import { 
  normalizeOpacity, 
  escapeHtml, 
  isValidLngLat, 
  validateAndCleanGeoJSON, 
  extractRouteCoordinates 
} from '../lib/geojson-validator.ts';
import { LOCAL_OFFLINE_STYLE, INDIA_COASTLINE_GEOJSON, INDIA_COASTAL_STATES_GEOJSON } from '../lib/offline-india-basemap.ts';
import { generatePopulationGridGeoJSON, generateForecastChangeGeoJSON } from '../lib/map-overlay-helpers.ts';

console.log('--- RUNNING CYCLONE-X MAP ENGINE UNIT TESTS ---');

// 1. Fill Opacity Normalization
console.log('1. Testing fill opacity normalization...');
assert.strictEqual(normalizeOpacity(25), 0.25, '25 should convert to 0.25');
assert.strictEqual(normalizeOpacity(35), 0.35, '35 should convert to 0.35');
assert.strictEqual(normalizeOpacity(100), 1.0, '100 should convert to 1.0');
assert.strictEqual(normalizeOpacity(0.45), 0.45, '0.45 should stay 0.45');
assert.strictEqual(normalizeOpacity(0.0), 0.0, '0.0 should stay 0.0');
assert.strictEqual(normalizeOpacity(1.0), 1.0, '1.0 should stay 1.0');
assert.strictEqual(normalizeOpacity(-5), 0.0, 'negative should clamp to 0.0');
assert.strictEqual(normalizeOpacity(150), 1.0, 'values > 100 should clamp to 1.0');
assert.strictEqual(normalizeOpacity(undefined, 0.4), 0.4, 'fallback should be respected');
console.log('  ✓ Fill opacity normalization passed.');

// 2. XSS HTML Sanitization
console.log('2. Testing XSS HTML sanitization...');
const xssPayload = '<script>alert("xss")</script>&"\'';
const sanitized = escapeHtml(xssPayload);
assert.ok(!sanitized.includes('<script>'), 'Must not contain unescaped script tag');
assert.strictEqual(sanitized, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&amp;&quot;&#039;');
console.log('  ✓ XSS HTML sanitization passed.');

// 3. Coordinate & Geometry Validation
console.log('3. Testing coordinate and geometry validation...');
assert.strictEqual(isValidLngLat([85.8, 19.8]), true, 'Valid Puri coords');
assert.strictEqual(isValidLngLat([185.0, 19.8]), false, 'Longitude > 180 invalid');
assert.strictEqual(isValidLngLat([85.8, 95.0]), false, 'Latitude > 90 invalid');
assert.strictEqual(isValidLngLat(['85.8', 19.8]), false, 'String coord invalid');
assert.strictEqual(isValidLngLat([NaN, 19.8]), false, 'NaN coord invalid');
console.log('  ✓ Coordinate validation passed.');

// 4. GeoJSON Cleaning & Opacity Normalization inside Features
console.log('4. Testing GeoJSON cleaning and opacity normalization...');
const rawGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[85.0, 19.0], [86.0, 19.0], [86.0, 20.0], [85.0, 20.0], [85.0, 19.0]]]
      },
      properties: { hazard_type: 'WIND_50KT', fill_opacity: 25 }
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [200.0, 999.0] // broken coordinates
      },
      properties: { name: 'Invalid Point' }
    }
  ]
};

const cleaned = validateAndCleanGeoJSON(rawGeoJSON);
assert.strictEqual(cleaned.features.length, 1, 'Should filter out invalid feature while preserving valid one');
assert.strictEqual(cleaned.features[0].properties.fill_opacity, 0.25, 'Feature opacity 25 must be normalized to 0.25');
console.log('  ✓ GeoJSON cleaning and opacity normalization passed.');

// 5. Route Coordinates Extraction
console.log('5. Testing route coordinates extraction...');
const mockRouteResponse = {
  route_geojson: {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [[85.8245, 20.2961], [85.8312, 19.8135]]
    }
  }
};
const extracted = extractRouteCoordinates(mockRouteResponse);
assert.ok(extracted, 'Should extract coordinates');
assert.strictEqual(extracted.length, 2);
assert.strictEqual(extracted[0][0], 85.8245);
assert.strictEqual(extracted[0][1], 20.2961);
console.log('  ✓ Route extraction passed.');

// 6. Population Grid Generation
console.log('6. Testing Population grid overlay generator...');
const popGrid = generatePopulationGridGeoJSON();
assert.strictEqual(popGrid.type, 'FeatureCollection');
assert.ok(popGrid.features.length >= 8, 'Must contain coastal population cells');
assert.ok(popGrid.features[0].properties.population > 0, 'Cell must have population');
assert.ok(popGrid.features[0].properties.density_per_sqkm > 0, 'Cell must have density');
assert.ok(popGrid.features[0].properties.source.includes('WorldPop'), 'Source must cite WorldPop/GHSL');
console.log('  ✓ Population grid generation passed.');

// 7. Forecast Change Overlay Generation
console.log('7. Testing Forecast Change overlay generator...');
const currentCoords = [[86.0, 18.0], [85.8, 19.0], [85.83, 19.81]];
const fcChange = generateForecastChangeGeoJSON(currentCoords);
assert.strictEqual(fcChange.type, 'FeatureCollection');
assert.ok(fcChange.features.length >= 4, 'Must contain prior track, current track, shift vector and markers');
const shiftVec = fcChange.features.find(f => f.properties.shift_type === 'LANDFALL_SHIFT_VECTOR');
assert.ok(shiftVec, 'Must contain Landfall Shift Vector');
assert.strictEqual(shiftVec.properties.shift_distance_km, 28.4);
console.log('  ✓ Forecast Change generator passed.');

// 8. Offline Basemap Specification
console.log('8. Testing Offline India basemap specification...');
assert.strictEqual(LOCAL_OFFLINE_STYLE.version, 8);
assert.ok(LOCAL_OFFLINE_STYLE.sources['offline-coastline'], 'Must contain offline coastline source');
assert.ok(LOCAL_OFFLINE_STYLE.sources['offline-states'], 'Must contain offline states source');
assert.ok(LOCAL_OFFLINE_STYLE.sources['offline-hubs'], 'Must contain offline coastal hubs source');
assert.ok(LOCAL_OFFLINE_STYLE.layers.length >= 5, 'Must contain offline styled layers');
assert.ok(INDIA_COASTLINE_GEOJSON.features.length >= 2, 'Must contain coastline coordinates');
assert.ok(INDIA_COASTAL_STATES_GEOJSON.features.length >= 4, 'Must contain coastal state polygons');
console.log('  ✓ Offline India basemap passed.');

console.log('--- ALL MAP ENGINE UNIT TESTS PASSED SUCCESSFULLY (8/8) ---');
