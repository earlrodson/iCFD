/**
 * Real coordinates for the Philippines' 17 administrative regions, keyed by
 * the bare ISO-3166-2 code Vercel/Cloudflare send (e.g. "07", "00") — see
 * geo.ts. Each value is that region's designated administrative center city,
 * not a computed geographic centroid; that's the standard convention for
 * this kind of point map and keeps every point on land, in the right region.
 *
 * The Philippines is this app's primary audience, so it gets real placement
 * instead of the cosmetic jitter used for every other country in
 * geo-centroids.ts. Sources: philatlas.com/regions.html and
 * un.org/geospatial (regional center list), cross-checked against each
 * center city's Wikipedia coordinates.
 */
export const PH_REGION_CENTROIDS: Record<string, [lat: number, lng: number]> = {
  '00': [14.5995, 120.9842], // NCR — Manila
  '01': [16.0433, 120.3335], // Ilocos Region — Dagupan
  '02': [17.6132, 121.7270], // Cagayan Valley — Tuguegarao
  '03': [15.0286, 120.6898], // Central Luzon — San Fernando, Pampanga
  '05': [13.1391, 123.7438], // Bicol Region — Legazpi
  '06': [10.7202, 122.5621], // Western Visayas — Iloilo City
  '07': [10.3157, 123.8854], // Central Visayas — Cebu City
  '08': [11.2447, 125.0000], // Eastern Visayas — Tacloban
  '09': [6.9214, 122.0790],  // Zamboanga Peninsula — Zamboanga City
  '10': [8.4542, 124.6319],  // Northern Mindanao — Cagayan de Oro
  '11': [7.1907, 125.4553],  // Davao Region — Davao City
  '12': [6.5031, 124.8467],  // Soccsksargen — Koronadal
  '13': [9.7897, 125.4941],  // Caraga — Surigao City
  '14': [7.2233, 124.2500],  // BARMM — Cotabato City
  '15': [16.4023, 120.5960], // Cordillera Administrative Region — Baguio
  '40': [14.2117, 121.1653], // Calabarzon — Calamba, Laguna
  '41': [13.4115, 121.1803], // Mimaropa — Calapan
}
