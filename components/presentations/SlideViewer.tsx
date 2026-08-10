'use client'

import { useEffect, useState } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface Slide {
  heading: string
  bullets: string[]
}

export default function SlideViewer({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0)
  const slide = slides[index]

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, slides.length - 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [slides.length])

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-8 min-h-[320px] flex flex-col justify-center shadow-sm">
        <h2 className="text-xl font-bold text-foreground mb-4">{slide.heading}</h2>
        <ul className="space-y-2.5 list-disc pl-5">
          {slide.bullets.map((b, i) => (
            <li key={i} className="text-sm text-foreground/90 leading-relaxed">{b}</li>
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
