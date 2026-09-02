// Parses a YouTube/Vimeo URL into a thumbnail and an embeddable player URL.
// No API calls — pure regex extraction, so it's safe to call at render time.

const YOUTUBE_ID_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/

export function getVideoThumbnail(url: string): string | null {
  const yt = url.match(YOUTUBE_ID_RE)
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`
  // Vimeo has no thumbnail-by-URL-pattern shortcut (needs an oEmbed call) —
  // callers should fall back to the topic's own cover image/gradient.
  return null
}

export function getVideoEmbedUrl(url: string): string | null {
  const yt = url.match(YOUTUBE_ID_RE)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`
  return null
}
