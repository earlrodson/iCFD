'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, User, BookBookmark, Buildings, Crown, FileText } from '@phosphor-icons/react'
import { PresentationToggle } from '@/components/topic/PresentationToggle'
import { usePresentationMode } from '@/store/useAppStore'
import {
  getAnswerText,
  getCitations,
  groupCitationsByType,
  type PresentationMode,
} from '@/lib/content/normalize'
import type { Topic, Citation } from '@/data/schema/topic.schema'

interface TopicContentProps {
  topic: Topic
}

// ─── Citation renderers ────────────────────────────────────────────────────────

function ScriptureCard({ citations, mode }: { citations: Extract<Citation, { type: 'scripture' }>[], mode: PresentationMode }) {
  if (citations.length === 0) return null

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <BookOpen weight="light" className="h-5 w-5" />
          Scripture References
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {citations.map((ref, i) => (
            <div key={i}>
              {mode === 'guide' ? (
                // Guide mode: reference + context only
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-primary">{ref.reference}</span>
                  {ref.version && (
                    <span className="text-xs text-muted-foreground">{ref.version}</span>
                  )}
                  {ref.context && (
                    <p className="text-sm text-muted-foreground mt-1 italic">→ {ref.context}</p>
                  )}
                </div>
              ) : (
                // Full / Concise mode: full verse text
                <div className="border-l-4 border-primary pl-4">
                  <blockquote className="italic text-base mb-2">
                    &ldquo;{ref.text}&rdquo;
                  </blockquote>
                  <cite className="text-sm text-muted-foreground not-italic">
                    — {ref.reference}
                    {ref.version && ` (${ref.version})`}
                  </cite>
                  {mode === 'full' && ref.context && (
                    <p className="text-sm text-muted-foreground mt-2 italic">→ {ref.context}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function CatechismCard({ citations, mode }: { citations: Extract<Citation, { type: 'catechism' }>[], mode: PresentationMode }) {
  if (citations.length === 0) return null
  if (mode === 'guide') return null // catechism hidden in guide mode

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <BookBookmark weight="light" className="h-5 w-5" />
          Catechism of the Catholic Church
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {citations.map((c, i) => (
            <div key={i} className="flex flex-col">
              <Badge variant="outline" className="font-mono">{c.reference}</Badge>
              {mode === 'full' && c.text && (
                <p className="text-sm text-muted-foreground mt-1 pl-1">{c.text}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ChurchFathersCard({ citations, mode }: { citations: Extract<Citation, { type: 'church-father' }>[], mode: PresentationMode }) {
  if (citations.length === 0) return null

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <User weight="light" className="h-5 w-5" />
          Church Fathers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {citations.map((f, i) => (
            <div key={i}>
              {mode === 'guide' ? (
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">{f.author}</span>
                  <span className="text-xs text-muted-foreground">{f.source}{f.year && `, ${f.year}`}</span>
                  {f.context && <p className="text-sm italic text-muted-foreground mt-1">→ {f.context}</p>}
                </div>
              ) : (
                <div className="border-l-4 border-secondary pl-4">
                  <div className="mb-2">
                    <span className="font-medium">{f.author}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({f.source}{f.year && `, ${f.year}`})
                    </span>
                  </div>
                  <blockquote className="italic">&ldquo;{f.quote}&rdquo;</blockquote>
                  {mode === 'full' && f.context && (
                    <p className="text-sm text-muted-foreground mt-2 italic">→ {f.context}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function CouncilCard({ citations, mode }: { citations: Extract<Citation, { type: 'council' }>[], mode: PresentationMode }) {
  if (citations.length === 0) return null
  if (mode === 'guide') return null

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Buildings weight="light" className="h-5 w-5" />
          Church Councils
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {citations.map((c, i) => (
            <div key={i} className="border-l-4 border-amber-500 pl-4">
              <p className="font-medium">{c.council}</p>
              <p className="text-sm text-muted-foreground">{c.document}{c.year && ` (${c.year})`}</p>
              {c.text && mode === 'full' && (
                <blockquote className="italic mt-2">&ldquo;{c.text}&rdquo;</blockquote>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function PapalCard({ citations, mode }: { citations: Extract<Citation, { type: 'papal' }>[], mode: PresentationMode }) {
  if (citations.length === 0) return null
  if (mode === 'guide') return null

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Crown weight="light" className="h-5 w-5" />
          Papal Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {citations.map((c, i) => (
            <div key={i} className="border-l-4 border-yellow-500 pl-4">
              <p className="font-medium">{c.document}</p>
              <p className="text-sm text-muted-foreground">{c.pope}{c.year && ` (${c.year})`}</p>
              {c.text && mode === 'full' && (
                <blockquote className="italic mt-2">&ldquo;{c.text}&rdquo;</blockquote>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function CustomCard({ citations }: { citations: Extract<Citation, { type: 'custom' }>[] }) {
  if (citations.length === 0) return null

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <FileText weight="light" className="h-5 w-5" />
          Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {citations.map((c, i) => (
            <div key={i}>
              <p className="font-medium text-sm mb-1">{c.label}</p>
              <p className="text-sm">{c.text}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function TopicContent({ topic }: TopicContentProps) {
  const mode = usePresentationMode()
  const answerText = getAnswerText(topic, mode)
  const citations = getCitations(topic)
  const grouped = groupCitationsByType(citations)

  return (
    <div>
      {/* Mode selector */}
      <div className="flex items-center justify-between mb-6">
        <PresentationToggle />
        {mode === 'guide' && (
          <span className="text-xs text-muted-foreground italic">
            References + context only — ideal for dialogue
          </span>
        )}
      </div>

      {/* Question */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">The Question</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg leading-relaxed">{topic.question}</p>
        </CardContent>
      </Card>

      {/* Answer */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            The Answer
            {mode === 'concise' && (
              <Badge variant="secondary" className="text-xs font-normal">Summary</Badge>
            )}
            {mode === 'guide' && (
              <Badge variant="outline" className="text-xs font-normal">Quick ref</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-slate max-w-none">
            {answerText.split('\n\n').map((paragraph, index) => (
              <p key={index} className="mb-4 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Citations — rendered by type */}
      <ScriptureCard citations={grouped.scripture} mode={mode} />
      <ChurchFathersCard citations={grouped.churchFathers} mode={mode} />
      <CatechismCard citations={grouped.catechism} mode={mode} />
      <CouncilCard citations={grouped.council} mode={mode} />
      <PapalCard citations={grouped.papal} mode={mode} />
      <CustomCard citations={grouped.custom} />
    </div>
  )
}
