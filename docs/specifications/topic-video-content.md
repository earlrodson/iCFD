---
schema_version: 1
id: topic-video-content
title: Per-language explainer video on topic pages
type: feature
status: new
priority: medium
owners: [earlrodson]
estimate_hours: 0
hours_logged: 0
created: 2026-09-02
updated: 2026-09-02
---

## Description
Let each topic's per-language row carry an optional explainer video (an external
YouTube/Vimeo embed URL) that the reader can play alongside the article — e.g.
a short video making the case for why every claim in the topic should be
verified against its cited sources. The topic hero already layers a category
gradient under an optional cover image; this adds video as a third layer with
priority: **video > image > gradient**.

## Traceability & Strategic Intent
- **Outcome Alignment:** Increase topic-page engagement and time-on-content per language.
- **Strategy Intent:** Readers who prefer video over long-form text get an equivalent entry point into the same sourced content, per language (en/ceb/tl).
- **Execution Intent:** Add a per-(id, lang) video field to `topics`, mirroring the existing `cover_image` column, and extend the hero rendering priority in `TopicContent.tsx`.
- **Benefit Hypothesis:**
  - *By implementing:* an optional, per-language video overlay on the topic hero
  - *We will improve:* engagement/completion on topics that have a video available
  - *As measured by:* click-through rate on the video hero vs. static-image hero baseline

## Product Context
- **Customer Context:** Readers on a topic page (`app/[topic]/page.tsx`) who scroll past the hero while reading; some prefer watching a short video over reading the full article.
- **Operating Context:** `topics` table is row-per-language (composite PK `(id, lang)`, `drizzle/schema.ts:41-82`), each row already has its own nullable `cover_image` (`drizzle/schema.ts:65`). No existing video infrastructure in the codebase (confirmed: zero references to "video"/"VideoPlayer"/"youtube"/"vimeo" anywhere in `app`, `components`, `lib`, `drizzle`) — this is greenfield.
- **Ecosystem Context:** Video is an externally-hosted embed (YouTube or Vimeo URL), not an uploaded file — no new storage bucket or upload flow needed.
- **Regulatory Context:** None beyond what already applies to embedding third-party iframes (standard `sandbox`/`allow` attributes on the embed).

## Behavior Specifications

```gherkin
Scenario: Topic has a video for the current language
  Given a topic row for (id, lang) has a non-null video_url
  When the reader opens the topic page
  Then the hero shows a play button over the video's thumbnail (not the cover image)
  And hovering the hero while it is in view shows a hover state (e.g. subtle scale/overlay)

Scenario: Reader clicks the video hero
  Given the hero is showing a video thumbnail with a play button
  When the reader clicks it
  Then the thumbnail is replaced by a playing embedded video (YouTube/Vimeo iframe)

Scenario: Topic has no video but has a cover image
  Given video_url is null and cover_image is non-null for (id, lang)
  When the reader opens the topic page
  Then the hero shows the cover image exactly as it does today (no behavior change)

Scenario: Topic has neither video nor image
  Given video_url is null and cover_image is null for (id, lang)
  When the reader opens the topic page
  Then the hero shows only the category gradient, exactly as it does today

Scenario: Video missing for this language but present for another
  Given video_url is null for (id, lang) but non-null for (id, other_lang)
  When the reader opens the topic page in lang
  Then the hero falls back to this language's cover image or gradient (no cross-language video fallback — video is per-language only, unlike cover_image's existing cross-language fallback)
```

## Acceptance criteria
- [ ] `topics` table has a new nullable `video_url` text column (per `(id, lang)` row, mirrors `cover_image`).
- [ ] Admin topic editor (`TopicEditor.tsx`) has a "Video URL" field per language tab, alongside the existing cover-image field.
- [ ] `TopicContent.tsx` hero renders in priority order: video thumbnail+play button (video_url present) > cover image (`heroSrc` present) > gradient only.
- [ ] Video hero shows a hover state (matching existing hover conventions in the codebase) when scrolled into view.
- [ ] Clicking the video hero swaps the thumbnail for a playing YouTube/Vimeo iframe embed.
- [ ] No cross-language fallback for `video_url` (unlike `cover_image`'s existing fallback) — a language with no video simply falls through to image/gradient for that language.
- [ ] Existing image/gradient-only topics are visually unchanged.

## Todos
- [ ] Add `video_url` migration + drizzle schema field (@earlrodson, est 1h)
- [ ] Add "Video URL" input to `TopicEditor.tsx` per-language tab (@earlrodson, est 1h)
- [ ] Build video hero component (thumbnail derivation from YouTube/Vimeo URL, play button, hover state, click-to-embed) in `TopicContent.tsx` (@earlrodson, est 3h)
- [ ] Update `loadTopicFromDatabase` (`lib/content/database.ts`) to select/pass through `video_url` (@earlrodson, est 1h)

## Daily log
- 2026-09-02 (@earlrodson, 0h): spec created

## Decisions & risks
- Video source is an external embed URL (YouTube/Vimeo), not an uploaded file — decided with user 2026-09-02 to avoid new storage/upload infra.
- No cross-language fallback for video (unlike `cover_image`) — a per-language video is expected to be authored per language, not shared; revisit if this proves too strict in practice.
- Thumbnail extraction approach (e.g. YouTube's `img.youtube.com/vi/<id>/hqdefault.jpg`) needs to handle both YouTube and Vimeo URL shapes — not yet designed in detail, flagged for the implementation todo.

## Links
- PR:
- Branch:
