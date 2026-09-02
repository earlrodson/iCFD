import { describe, it, expect } from 'vitest'
import { getVideoThumbnail, getVideoEmbedUrl } from '@/lib/content/videoEmbed'

describe('getVideoThumbnail', () => {
  it('extracts a thumbnail from a standard youtube.com/watch?v= URL', () => {
    expect(getVideoThumbnail('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
  })

  it('extracts a thumbnail from a youtu.be short URL', () => {
    expect(getVideoThumbnail('https://youtu.be/dQw4w9WgXcQ'))
      .toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
  })

  it('extracts a thumbnail from a youtube.com/shorts/ URL', () => {
    expect(getVideoThumbnail('https://www.youtube.com/shorts/dQw4w9WgXcQ'))
      .toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
  })

  it('returns null for a Vimeo URL (no thumbnail shortcut)', () => {
    expect(getVideoThumbnail('https://vimeo.com/123456789')).toBeNull()
  })

  it('returns null for a non-matching URL', () => {
    expect(getVideoThumbnail('https://example.com/not-a-video')).toBeNull()
  })
})

describe('getVideoEmbedUrl', () => {
  it('builds a youtube embed URL from a watch URL', () => {
    expect(getVideoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1')
  })

  it('builds a youtube embed URL from a youtu.be URL', () => {
    expect(getVideoEmbedUrl('https://youtu.be/dQw4w9WgXcQ'))
      .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1')
  })

  it('builds a vimeo embed URL from a numeric Vimeo URL', () => {
    expect(getVideoEmbedUrl('https://vimeo.com/123456789'))
      .toBe('https://player.vimeo.com/video/123456789?autoplay=1')
  })

  it('returns null for a non-matching/garbage URL', () => {
    expect(getVideoEmbedUrl('https://example.com/not-a-video')).toBeNull()
  })
})
