import { useEffect, useState } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { APP_CONFIG } from '@/lib/config'

type SiteConfigMap = Record<string, string>

let cache: SiteConfigMap | null = null

export function useSiteConfig() {
  const [config, setConfig] = useState<SiteConfigMap>(() => cache ?? {})

  useEffect(() => {
    if (cache) { setConfig(cache); return }
    if (!isSupabaseConfigured()) return

    const supabase = createClient()
    supabase
      .from('site_config')
      .select('key, value')
      .then(({ data }) => {
        if (!data) return
        const map: SiteConfigMap = {}
        for (const row of data) map[row.key] = row.value
        cache = map
        setConfig(map)
      })
  }, [])

  return {
    appName: config['appName'] ?? APP_CONFIG.appName,
    appShortName: config['appShortName'] ?? APP_CONFIG.appShortName,
    description: config['description'] ?? APP_CONFIG.description,
    version: config['version'] ?? APP_CONFIG.version,
  }
}
