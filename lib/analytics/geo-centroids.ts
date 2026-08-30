import countries from 'world-countries'
import { PH_REGION_CENTROIDS } from './ph-region-centroids'

/**
 * Approximate map coordinates for a (country, region) analytics pair.
 *
 * We only ever store coarse country + ISO-3166-2 region codes (see geo.ts —
 * no raw IP, no city/lat-lng). The Philippines (this app's primary audience)
 * gets real per-region placement via PH_REGION_CENTROIDS. Every other
 * country falls back to its centroid (`world-countries`) nudged by a
 * deterministic hash-based offset so same-country regions don't stack on one
 * point — that offset is cosmetic spread, not a real position, and can land
 * outside the country's borders for small countries or ones near a land
 * border (acceptable given the low view counts non-PH countries see today).
 */

const COUNTRY_CENTROIDS = new Map<string, [lat: number, lng: number]>(
  countries.map((c) => [c.cca2, [c.latlng[0], c.latlng[1]]]),
)

const JITTER_DEGREES = 1.5

// djb2 + a multiplicative avalanche finalizer (Murmur3-style fmix32) so short
// inputs (most region codes are 2-3 chars, e.g. "07", "CA") still produce
// well-distributed bits — a plain rolling hash leaves the upper bits of short
// strings near zero, which collapsed every region's longitude onto the same
// value (see the PH region codes that motivated this fix).
function hash32(value: string): number {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x85ebca6b)
  hash ^= hash >>> 13
  hash = Math.imul(hash, 0xc2b2ae35)
  hash ^= hash >>> 16
  return hash >>> 0
}

function unitOffset(hash: number): number {
  return ((hash / 0xffffffff) * 2 - 1) * JITTER_DEGREES
}

export function getCoordinates(country: string, region: string | null): [lat: number, lng: number] | null {
  const countryCode = country.toUpperCase()
  if (countryCode === 'PH' && region && PH_REGION_CENTROIDS[region.toUpperCase()]) {
    return PH_REGION_CENTROIDS[region.toUpperCase()]
  }

  const centroid = COUNTRY_CENTROIDS.get(countryCode)
  if (!centroid) return null
  if (!region) return centroid

  const latOffset = unitOffset(hash32(`${region}|lat`))
  const lngOffset = unitOffset(hash32(`${region}|lng`))
  return [centroid[0] + latOffset, centroid[1] + lngOffset]
}
