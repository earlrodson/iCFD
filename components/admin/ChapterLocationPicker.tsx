'use client'

import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MagnifyingGlass, X, Spinner, MapPin } from '@phosphor-icons/react'

// See GeoHeatmap.tsx for why this is needed — same bundler worker-URL issue.
maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs')

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
}

const MARKER_COLOR = '#c6a200'

/**
 * Modal map picker for setting a chapter's lat/lng: search a place via
 * Nominatim (OpenStreetMap's free geocoder, no API key) or click/drag
 * directly on the map. Caller owns persistence via onSave.
 */
export function ChapterLocationPicker({
  chapterName,
  initialLat,
  initialLng,
  onSave,
  onClose,
}: {
  chapterName: string
  initialLat: number | null
  initialLng: number | null
  onSave: (lat: number, lng: number) => Promise<void>
  onClose: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null,
  )
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)

  function placeMarker(lat: number, lng: number) {
    setCoords({ lat, lng })
    const map = mapRef.current
    if (!map) return
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat])
    } else {
      const marker = new maplibregl.Marker({ color: MARKER_COLOR, draggable: true })
        .setLngLat([lng, lat])
        .addTo(map)
      marker.on('dragend', () => {
        const ll = marker.getLngLat()
        setCoords({ lat: ll.lat, lng: ll.lng })
      })
      markerRef.current = marker
    }
    map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 13) })
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: coords ? [coords.lng, coords.lat] : [122, 13],
      zoom: coords ? 13 : 5,
      attributionControl: { compact: true },
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map

    map.on('load', () => {
      if (coords) placeMarker(coords.lat, coords.lng)
    })
    map.on('click', (e) => placeMarker(e.lngLat.lat, e.lngLat.lng))

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // Map is created once; coords updates thereafter go through placeMarker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!query.trim() || query.trim().length < 3) { setResults([]); return }
    const handle = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`,
        )
        setResults(res.ok ? await res.json() : [])
      } catch {
        setResults([])
      }
      setSearching(false)
    }, 500) // Nominatim's usage policy caps free requests at ~1/sec.
    return () => clearTimeout(handle)
  }, [query])

  function selectResult(r: NominatimResult) {
    placeMarker(parseFloat(r.lat), parseFloat(r.lon))
    setResults([])
    setQuery(r.display_name)
  }

  async function handleSave() {
    if (!coords) return
    setSaving(true)
    await onSave(coords.lat, coords.lng)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm text-foreground">Set location — {chapterName}</p>
          <button onClick={onClose} className="icon-btn hover:bg-muted">
            <X weight="light" size={16} />
          </button>
        </div>

        <div className="relative">
          <MagnifyingGlass weight="light" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a place…"
            className="field pl-9"
          />
          {searching && (
            <Spinner weight="light" size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => selectResult(r)}
                  className="block w-full truncate px-3 py-2 text-left text-xs text-foreground hover:bg-muted transition-colors"
                >
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={containerRef} className="h-72 w-full overflow-hidden rounded-xl border border-border" />

        <p className="text-xs text-muted-foreground">Click the map or search to place the pin — drag it to fine-tune.</p>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!coords || saving}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {saving ? <Spinner weight="light" size={15} className="animate-spin" /> : <MapPin weight="fill" size={15} />}
            {saving ? 'Saving…' : 'Save location'}
          </button>
        </div>
      </div>
    </div>
  )
}
