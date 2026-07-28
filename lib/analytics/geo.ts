/**
 * Coarse, IP-derived location for analytics — never the raw IP itself.
 * Vercel populates x-vercel-ip-* on every request; Cloudflare's cf-ipcountry
 * is checked as a fallback for other hosts. Local dev has neither, so this
 * degrades to `null` rather than guessing.
 */
export function getGeoFromHeaders(headers: Headers): { country: string | null; region: string | null } {
  const country =
    headers.get('x-vercel-ip-country') ??
    headers.get('cf-ipcountry') ??
    null
  const region = headers.get('x-vercel-ip-country-region') ?? null
  return { country: country || null, region: region || null }
}

/** Coarse device class from the User-Agent — good enough for a bucketed chart, not device detection. */
export function getDeviceType(userAgent: string | null): 'mobile' | 'tablet' | 'desktop' {
  if (!userAgent) return 'desktop'
  const ua = userAgent.toLowerCase()
  if (/ipad|tablet(?!.*mobile)/.test(ua)) return 'tablet'
  if (/mobi|iphone|android/.test(ua)) return 'mobile'
  return 'desktop'
}
