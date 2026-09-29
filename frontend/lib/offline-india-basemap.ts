import type { StyleSpecification } from 'maplibre-gl';

/**
 * Bundled High-Resolution India Coastal and State GeoJSON Geometries
 * Provides zero-network standalone offline basemap functionality.
 */

export const INDIA_COASTLINE_GEOJSON: any = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Mainland Coastline', type: 'coastline' },
      geometry: {
        type: 'LineString',
        coordinates: [
          // Gujarat / Kutch / Arabian Sea
          [68.1, 23.7], [68.8, 23.0], [69.5, 22.8], [70.2, 22.9],
          [70.1, 22.3], [69.6, 21.8], [69.8, 21.1], [70.4, 20.9],
          [71.5, 20.8], [72.1, 21.4], [72.2, 21.9], [72.7, 21.2],
          [72.8, 20.6], [72.8, 19.8], [72.8, 19.0], [72.9, 18.2],
          // Maharashtra & Goa
          [73.2, 17.5], [73.5, 16.5], [73.8, 15.5], [74.2, 14.8],
          // Karnataka & Kerala
          [74.7, 13.9], [74.9, 13.2], [75.3, 12.0], [75.8, 11.2],
          [76.2, 10.0], [76.5, 9.4], [76.8, 8.8], [77.5, 8.1], // Kanyakumari
          // Tamil Nadu / Coromandel Coast
          [77.8, 8.5], [78.2, 9.1], [79.2, 9.3], [79.3, 9.8],
          [79.8, 10.3], [79.8, 11.0], [79.8, 11.8], [80.3, 13.1], // Chennai
          // Andhra Pradesh
          [80.1, 14.0], [80.1, 15.0], [80.6, 15.8], [81.5, 16.4],
          [82.2, 16.9], [83.3, 17.7], [84.1, 18.3], [84.7, 18.9],
          // Odisha Coast
          [85.0, 19.3], [85.5, 19.6], [85.8, 19.8], [86.2, 19.8], // Puri
          [86.7, 20.3], [87.0, 20.8], [87.3, 21.3], [87.5, 21.6], // Chandipur/Baleshwar
          // West Bengal / Sundarbans
          [87.9, 21.7], [88.2, 21.6], [88.6, 21.7], [89.1, 21.8], [89.2, 22.0]
        ]
      }
    },
    {
      type: 'Feature',
      properties: { name: 'Andaman & Nicobar Islands', type: 'island_coast' },
      geometry: {
        type: 'MultiLineString',
        coordinates: [
          [[92.7, 11.4], [92.8, 12.0], [92.9, 13.0], [93.0, 13.4], [92.8, 13.0], [92.7, 11.4]],
          [[93.6, 7.0], [93.8, 7.3], [93.9, 8.0], [93.7, 8.5], [93.5, 7.5], [93.6, 7.0]]
        ]
      }
    }
  ]
};

export const INDIA_COASTAL_STATES_GEOJSON: any = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Odisha', code: 'OD', risk: 'VERY_HIGH' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [84.5, 18.8], [85.2, 19.4], [85.8, 19.8], [86.7, 20.3],
          [87.5, 21.6], [86.8, 22.3], [85.3, 22.1], [83.8, 21.2],
          [82.6, 19.8], [83.5, 19.1], [84.5, 18.8]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { name: 'West Bengal', code: 'WB', risk: 'HIGH' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [87.5, 21.6], [88.5, 21.6], [89.2, 22.0], [88.9, 23.5],
          [87.8, 24.0], [86.8, 23.0], [87.0, 22.0], [87.5, 21.6]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { name: 'Andhra Pradesh', code: 'AP', risk: 'VERY_HIGH' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [84.5, 18.8], [83.3, 17.7], [82.2, 16.9], [81.5, 16.4],
          [80.1, 14.0], [79.5, 13.5], [78.5, 14.5], [80.5, 16.5],
          [82.0, 18.0], [83.5, 18.9], [84.5, 18.8]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { name: 'Tamil Nadu', code: 'TN', risk: 'HIGH' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [80.3, 13.1], [79.8, 10.3], [78.2, 9.1], [77.5, 8.1],
          [76.8, 9.2], [77.2, 10.8], [78.5, 12.0], [79.8, 12.8], [80.3, 13.1]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { name: 'Gujarat', code: 'GJ', risk: 'HIGH' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [68.1, 23.7], [70.2, 22.9], [69.8, 21.1], [71.5, 20.8],
          [72.8, 21.2], [73.5, 22.5], [72.5, 24.0], [70.5, 24.2], [68.1, 23.7]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { name: 'Kerala', code: 'KL', risk: 'MODERATE' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [75.0, 12.5], [75.8, 11.2], [76.5, 9.4], [77.5, 8.1],
          [77.2, 9.2], [76.8, 10.5], [75.8, 12.0], [75.0, 12.5]
        ]]
      }
    }
  ]
};

export const INDIA_COASTAL_HUBS_GEOJSON: any = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Puri Port & City', category: 'Major Pilgrimage & Coastal City', state: 'Odisha' }, geometry: { type: 'Point', coordinates: [85.8312, 19.8135] } },
    { type: 'Feature', properties: { name: 'Paradip Port', category: 'Major Deepwater Port', state: 'Odisha' }, geometry: { type: 'Point', coordinates: [86.6854, 20.2644] } },
    { type: 'Feature', properties: { name: 'Bhubaneswar State EOC', category: 'Emergency Operations Center', state: 'Odisha' }, geometry: { type: 'Point', coordinates: [85.8245, 20.2961] } },
    { type: 'Feature', properties: { name: 'Gopalpur Port', category: 'Commercial Port', state: 'Odisha' }, geometry: { type: 'Point', coordinates: [84.9080, 19.2600] } },
    { type: 'Feature', properties: { name: 'Dhamra Port', category: 'Deep Draft Bulk Port', state: 'Odisha' }, geometry: { type: 'Point', coordinates: [86.9730, 20.8170] } },
    { type: 'Feature', properties: { name: 'Kolkata EOC', category: 'Metropolitan Center', state: 'West Bengal' }, geometry: { type: 'Point', coordinates: [88.3639, 22.5726] } },
    { type: 'Feature', properties: { name: 'Haldia Port', category: 'Industrial Complex & Port', state: 'West Bengal' }, geometry: { type: 'Point', coordinates: [88.0833, 22.0667] } },
    { type: 'Feature', properties: { name: 'Visakhapatnam Port & Naval HQ', category: 'Naval Command & Port', state: 'Andhra Pradesh' }, geometry: { type: 'Point', coordinates: [83.2185, 17.6868] } },
    { type: 'Feature', properties: { name: 'Kakinada Deepwater Port', category: 'Anchor Port', state: 'Andhra Pradesh' }, geometry: { type: 'Point', coordinates: [82.2850, 16.9890] } },
    { type: 'Feature', properties: { name: 'Chennai Port & EOC', category: 'Major Container Port', state: 'Tamil Nadu' }, geometry: { type: 'Point', coordinates: [80.2974, 13.0827] } },
    { type: 'Feature', properties: { name: 'Nagapattinam Port', category: 'Coastal Anchorage', state: 'Tamil Nadu' }, geometry: { type: 'Point', coordinates: [79.8450, 10.7650] } },
    { type: 'Feature', properties: { name: 'Mumbai Port Trust', category: 'Mega Commercial Port', state: 'Maharashtra' }, geometry: { type: 'Point', coordinates: [72.8450, 18.9500] } },
    { type: 'Feature', properties: { name: 'Kandla / Deendayal Port', category: 'Major Western Port', state: 'Gujarat' }, geometry: { type: 'Point', coordinates: [70.2180, 23.0100] } },
    { type: 'Feature', properties: { name: 'Port Blair Harbor', category: 'Island Maritime Base', state: 'Andaman & Nicobar' }, geometry: { type: 'Point', coordinates: [92.7300, 11.6660] } }
  ]
};

/**
 * Complete Zero-Network Offline Basemap Style Specification
 */
export const LOCAL_OFFLINE_STYLE: StyleSpecification = {
  version: 8,
  name: 'Cyclone-X India Offline Basemap',
  sources: {
    'offline-coastline': {
      type: 'geojson',
      data: INDIA_COASTLINE_GEOJSON
    },
    'offline-states': {
      type: 'geojson',
      data: INDIA_COASTAL_STATES_GEOJSON
    },
    'offline-hubs': {
      type: 'geojson',
      data: INDIA_COASTAL_HUBS_GEOJSON
    }
  },
  layers: [
    {
      id: 'offline-ocean-background',
      type: 'background',
      paint: {
        'background-color': '#060d1a'
      }
    },
    {
      id: 'offline-states-fill',
      type: 'fill',
      source: 'offline-states',
      paint: {
        'fill-color': '#0f172a',
        'fill-opacity': 0.85
      }
    },
    {
      id: 'offline-states-boundary',
      type: 'line',
      source: 'offline-states',
      paint: {
        'line-color': '#334155',
        'line-width': 1.2,
        'line-dasharray': [2, 1]
      }
    },
    {
      id: 'offline-coastline-glow',
      type: 'line',
      source: 'offline-coastline',
      paint: {
        'line-color': '#0284c7',
        'line-width': 4.0,
        'line-opacity': 0.4
      }
    },
    {
      id: 'offline-coastline-line',
      type: 'line',
      source: 'offline-coastline',
      paint: {
        'line-color': '#38bdf8',
        'line-width': 1.8
      }
    },
    {
      id: 'offline-hubs-circle',
      type: 'circle',
      source: 'offline-hubs',
      paint: {
        'circle-radius': 4.5,
        'circle-color': '#38bdf8',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.2
      }
    }
  ]
};
