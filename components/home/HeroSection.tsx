import type { Topic } from '@/data/schema/topic.schema'

interface HeroSectionProps {
  topics: Topic[]
}

const CATEGORY_COUNT = 8

export function HeroSection({ topics }: HeroSectionProps) {
  return (
    <section className="px-4 pt-8 pb-6 text-center">
      <div className="mb-2 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        Offline-First Catholic Apologetics
      </div>
      <h1 className="mt-3 text-3xl font-bold text-foreground tracking-tight">
        Catholic Faith
        <br />
        <span className="text-primary">Defender</span>
      </h1>
      <p className="mt-3 text-base text-muted-foreground max-w-sm mx-auto leading-relaxed">
        Defend your faith with Scripture, Tradition, and the Catechism — available offline.
      </p>

      {/* Stats */}
      <div className="mt-6 flex justify-center gap-8">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{topics.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Topics</div>
        </div>
        <div className="w-px bg-border" />
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{CATEGORY_COUNT}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Categories</div>
        </div>
        <div className="w-px bg-border" />
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">3</div>
          <div className="text-xs text-muted-foreground mt-0.5">Languages</div>
        </div>
      </div>
    </section>
  )
}
