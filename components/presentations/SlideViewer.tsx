'use client'

import { useEffect, useRef, useState } from 'react'
import { CaretLeft, CaretRight, ArrowsOut, ArrowsIn } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface Slide {
  heading: string
  bullets: string[]
}

export default function SlideViewer({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const slide = slides[index]

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, slides.length - 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [slides.length])

  useEffect(() => {
    // Also fires on Escape, so this is the source of truth for isFullscreen,
    // not the toggle button click handler.
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await containerRef.current?.requestFullscreen()
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col gap-4 bg-background',
        isFullscreen && 'h-full justify-center px-8 py-6 md:px-24',
      )}
    >
      <div
        className={cn(
          'relative rounded-2xl border border-border bg-card p-8 min-h-[320px] flex flex-col justify-center shadow-sm',
          isFullscreen && 'min-h-[60vh] p-16',
        )}
      >
        <button
          onClick={toggleFullscreen}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <ArrowsIn weight="light" size={16} /> : <ArrowsOut weight="light" size={16} />}
        </button>

        <h2 className={cn('font-bold text-foreground mb-4', isFullscreen ? 'text-4xl' : 'text-xl')}>
          {slide.heading}
        </h2>
        <ul className={cn('list-disc pl-5', isFullscreen ? 'space-y-4' : 'space-y-2.5')}>
          {slide.bullets.map((b, i) => (
            <li key={i} className={cn('text-foreground/90 leading-relaxed', isFullscreen ? 'text-2xl' : 'text-sm')}>
              {b}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          disabled={index === 0}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
        >
          <CaretLeft weight="light" size={15} /> Prev
        </button>

        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === index ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30',
              )}
            />
          ))}
        </div>

        <button
          onClick={() => setIndex((i) => Math.min(i + 1, slides.length - 1))}
          disabled={index === slides.length - 1}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
        >
          Next <CaretRight weight="light" size={15} />
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {index + 1} / {slides.length}
      </p>
    </div>
  )
}
