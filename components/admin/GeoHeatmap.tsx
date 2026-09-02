'use client'

import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getCoordinates } from '@/lib/analytics/geo-centroids'

interface GeoStat {
  country: string
  region: string
  is_member: boolean
  view_count: number
}

interface ChapterPoint {
  id: string
  name: string
  type: 'parish' | 'school'
  lat: number
  lng: number
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

export type GeoMemberFilter = 'all' | 'member' | 'non-member'

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
// Non-members keep this original gold ramp; CFD members get a green ramp of
// the same shape so the two series read as distinct hues, not intensities.
const NON_MEMBER_HEATMAP_COLOR: maplibregl.ExpressionSpecification = [
  'interpolate', ['linear'], ['heatmap-density'],
  0,    'rgba(252,249,234,0)',
  0.2,  '#fcf9ea',
  0.4,  '#f6e697',
  0.6,  '#e1c429',
  0.8,  '#c6a200',
  1,    '#6d5200',
]

const MEMBER_HEATMAP_COLOR: maplibregl.ExpressionSpecification = [
  'interpolate', ['linear'], ['heatmap-density'],
  0,    'rgba(236,253,245,0)',
  0.2,  '#ecfdf5',
  0.4,  '#86efac',
  0.6,  '#22c55e',
  0.8,  '#15803d',
  1,    '#14532d',
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

function layerVisibility(show: boolean): 'visible' | 'none' {
  return show ? 'visible' : 'none'
}

/**
 * Visitor density heatmap over approximate country/region centroids (see
 * lib/analytics/geo-centroids.ts), split into a green layer for CFD members
 * and a gold layer for non-members, plus optional chapter location markers.
 */
export function GeoHeatmap({
  data,
  filter = 'all',
  chapters = [],
}: {
  data: GeoStat[]
  filter?: GeoMemberFilter
  chapters?: ChapterPoint[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const dataRef = useRef(data)
  const chaptersRef = useRef(chapters)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    chaptersRef.current = chapters
  }, [chapters])

  function renderChapterMarkers(map: maplibregl.Map, points: ChapterPoint[]) {
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = points.map((c) => {
      const el = document.createElement('div')
      el.style.width = '10px'
      el.style.height = '10px'
      el.style.borderRadius = '50%'
      el.style.background = '#3b82f6'
      el.style.border = '2px solid white'
      el.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.25)'
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([c.lng, c.lat])
        .setPopup(new maplibregl.Popup({ offset: 10 }).setText(`${c.name} (${c.type})`))
        .addTo(map)
      return marker
    })
  }

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
      const memberData = toGeoJSON(dataRef.current.filter((s) => s.is_member))
      const nonMemberData = toGeoJSON(dataRef.current.filter((s) => !s.is_member))

      map.addSource('geo-views-member', { type: 'geojson', data: memberData })
      map.addLayer({
        id: 'geo-heatmap-member',
        type: 'heatmap',
        source: 'geo-views-member',
        layout: { visibility: layerVisibility(filter !== 'non-member') },
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 500, 1],
          'heatmap-intensity': 1.2,
          'heatmap-radius': 30,
          'heatmap-opacity': 0.85,
          'heatmap-color': MEMBER_HEATMAP_COLOR,
        },
      })

      map.addSource('geo-views-nonmember', { type: 'geojson', data: nonMemberData })
      map.addLayer({
        id: 'geo-heatmap-nonmember',
        type: 'heatmap',
        source: 'geo-views-nonmember',
        layout: { visibility: layerVisibility(filter !== 'member') },
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 500, 1],
          'heatmap-intensity': 1.2,
          'heatmap-radius': 30,
          'heatmap-opacity': 0.85,
          'heatmap-color': NON_MEMBER_HEATMAP_COLOR,
        },
      })

      renderChapterMarkers(map, chaptersRef.current)
    })

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const memberSource = map.getSource('geo-views-member') as maplibregl.GeoJSONSource | undefined
    const nonMemberSource = map.getSource('geo-views-nonmember') as maplibregl.GeoJSONSource | undefined
    memberSource?.setData(toGeoJSON(data.filter((s) => s.is_member)))
    nonMemberSource?.setData(toGeoJSON(data.filter((s) => !s.is_member)))
  }, [data])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.getLayer('geo-heatmap-member')) return
    map.setLayoutProperty('geo-heatmap-member', 'visibility', layerVisibility(filter !== 'non-member'))
    map.setLayoutProperty('geo-heatmap-nonmember', 'visibility', layerVisibility(filter !== 'member'))
  }, [filter])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    renderChapterMarkers(map, chapters)
  }, [chapters])

  return (
    <div
      ref={containerRef}
      className="h-72 w-full overflow-hidden rounded-2xl border border-border"
    />
  )
}
