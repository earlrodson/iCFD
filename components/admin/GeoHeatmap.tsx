'use client'

import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getCoordinates } from '@/lib/analytics/geo-centroids'

interface GeoStat {
  country: string
  region: string
  view_count: number
}

interface GeoPointFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: { weight: number }
}

interface GeoFeatureCollection {
  type: 'FeatureCollection'
  features: GeoPointFeature[]
}

// Bundlers (Turbopack and webpack alike) don't resolve maplibre-gl's internal
// `new Worker(new URL(...))` reference — tiles silently never load, no error
// thrown. Point it at a same-origin copy instead (kept in sync by
// scripts/copy-maplibre-worker.mjs, run on every install).
maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs')

// A flat single-tone basemap — the maplibre demo style's per-country pastel
// fill competes with the heatmap for attention. We reuse its vector tile
// source (geometry only) but supply our own minimal paint so land/ocean
// recede behind the gold density layer. Dark variant matches the CFD navy
// brand color so the heatmap reads the same way the brand's gold-on-navy
// marketing treatment does.
function buildFlatStyle(isDark: boolean): maplibregl.StyleSpecification {
  const colors = isDark
    ? { background: '#10182F', land: '#1B2540', boundary: '#2E3A5C' }
    : { background: '#E4E7EB', land: '#CBD2DA', boundary: '#A8B0BA' }
  return {
    version: 8,
    sources: {
      countries: { type: 'vector', url: 'https://demotiles.maplibre.org/tiles/tiles.json' },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': colors.background } },
      {
        id: 'countries-fill',
        type: 'fill',
        source: 'countries',
        'source-layer': 'countries',
        paint: { 'fill-color': colors.land },
      },
      {
        id: 'countries-boundary',
        type: 'line',
        source: 'countries',
        'source-layer': 'countries',
        paint: { 'line-color': colors.boundary, 'line-width': 0.5 },
      },
    ],
  }
}

// Sequential ramp, one hue (CFD brand gold, OKLCH h≈97.5) light -> dark, per
// the dataviz skill's rule against rainbow gradients on magnitude data.
const HEATMAP_COLOR: maplibregl.ExpressionSpecification = [
  'interpolate', ['linear'], ['heatmap-density'],
  0,    'rgba(252,249,234,0)',
  0.2,  '#fcf9ea',
  0.4,  '#f6e697',
  0.6,  '#e1c429',
  0.8,  '#c6a200',
  1,    '#6d5200',
]

function toGeoJSON(stats: GeoStat[]): GeoFeatureCollection {
  const features: GeoPointFeature[] = []
  for (const stat of stats) {
    const coords = getCoordinates(stat.country, stat.region || null)
    if (!coords) continue
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [coords[1], coords[0]] },
      properties: { weight: stat.view_count },
    })
  }
  return { type: 'FeatureCollection', features }
}

/** Visitor density heatmap over approximate country/region centroids — see lib/analytics/geo-centroids.ts. */
export function GeoHeatmap({ data }: { data: GeoStat[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const dataRef = useRef(data)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const isDark = document.documentElement.classList.contains('dark')
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildFlatStyle(isDark),
      center: [122, 13], // Philippines
      zoom: 4.2,
      attributionControl: false,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map

    map.on('load', () => {
      map.addSource('geo-views', { type: 'geojson', data: toGeoJSON(dataRef.current) })
      map.addLayer({
        id: 'geo-heatmap',
        type: 'heatmap',
        source: 'geo-views',
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 500, 1],
          'heatmap-intensity': 1.2,
          'heatmap-radius': 30,
          'heatmap-opacity': 0.85,
          'heatmap-color': HEATMAP_COLOR,
        },
      })
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const source = map.getSource('geo-views') as maplibregl.GeoJSONSource | undefined
    source?.setData(toGeoJSON(data))
  }, [data])

  return (
    <div
      ref={containerRef}
      className="h-72 w-full overflow-hidden rounded-2xl border border-border"
    />
  )
}
