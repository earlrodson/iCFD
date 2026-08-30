// Copies maplibre-gl's bundled worker script into public/ so it can be loaded
// same-origin via maplibregl.setWorkerUrl() — neither Turbopack nor webpack
// resolve maplibre-gl's internal `new Worker(new URL(...))` reference
// correctly when the package is bundled, which silently breaks all vector
// tile loading (style renders as a flat background color, no error thrown).
// Re-run automatically on every install so this stays in sync with the
// installed maplibre-gl version.
import { copyFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// The worker imports maplibre-gl-shared.mjs by relative URL at runtime, so
// both files must land side by side in public/.
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  const src = require.resolve(`maplibre-gl/dist/${file}`)
  const dest = new URL(`../public/${file}`, import.meta.url)
  copyFileSync(src, dest)
  console.log(`Copied ${src} -> public/${file}`)
}
