/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
}

if (process.env.NODE_ENV === 'production') {
  const withPWA = require('@ducanh2912/next-pwa').default({
    dest: 'public',
    register: true,
    skipWaiting: true,
    customWorkerSrc: 'worker',
    // Serve the cached root shell for any navigation that fails offline.
    // The client component then boots and reads from the cached handbook.json.
    fallbacks: {
      document: '/',
    },
    runtimeCaching: [
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images',
          expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\.json$/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'content',
          expiration: { maxEntries: 20, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
    ],
  })
  module.exports = withPWA(nextConfig)
} else {
  module.exports = nextConfig
}
