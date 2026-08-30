import { allCountries } from 'country-region-data'

/**
 * Resolves a stored (country, region) analytics pair to a human-readable
 * region name — e.g. ('PH', '11') -> 'Davao' instead of the raw ISO-3166-2
 * code. Falls back to the raw code when the country/region isn't in the
 * dataset (some Vercel/Cloudflare region codes don't map to a known
 * subdivision).
 */
// country-region-data mixes prefixed slugs ("PH-11") and bare ones ("CA" for
// US states) — strip any leading "<COUNTRY>-" so lookups can be keyed on the
// bare code, matching how Vercel/Cloudflare send the region header.
const REGION_NAMES = new Map<string, Map<string, string>>()
for (const [, countrySlug, regions] of allCountries) {
  const byRegion = new Map<string, string>()
  for (const [regionName, regionSlug] of regions) {
    const prefix = `${countrySlug}-`
    const bareCode = regionSlug.toUpperCase().startsWith(prefix) ? regionSlug.slice(prefix.length) : regionSlug
    byRegion.set(bareCode.toUpperCase(), regionName)
  }
  REGION_NAMES.set(countrySlug, byRegion)
}

export function getRegionName(country: string, region: string | null): string | null {
  if (!region) return null
  return REGION_NAMES.get(country.toUpperCase())?.get(region.toUpperCase()) ?? region
}
