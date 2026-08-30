# iCFD — Board of Governors Presentation: Build Notes

Generated 2026-08-30. Source content: `../iCFD-Board-of-Governors-Presentation.md`.

## Deliverables

- `iCFD-Board-of-Governors-Presentation.html` — single-file, editable source of truth (open in any browser). Print via Chrome/Edge "Print to PDF", landscape, no margins, for a fresh PDF if the content is edited later.
- `iCFD-Board-of-Governors-Presentation.pdf` — rendered directly from the HTML via headless Chromium (Playwright), 1280×720 per page, 26 pages.
- `iCFD-Board-of-Governors-Presentation.pptx` — generated natively (not converted from PDF) via `pptxgenjs`, using the same slide content. Real editable text boxes/shapes/tables in PowerPoint/Keynote/Google Slides. **Not visually rendered in this environment** (no LibreOffice/PowerPoint available) — do a quick visual pass before presenting; structural validity was confirmed (valid zip, 26 slides).
- `assets/logo.png` — copied from `public/logo.png`.
- `assets/screenshots/*.png` — captured live via Playwright against the running dev server (`pnpm dev`, localhost:3000) on 2026-08-30.

## Slide sequence (26 slides)

1. Title · 2. Who I Am · 3. My Journey · 4. The Problem · 5. Problem Video (placeholder) · 6. 12 Questions · 7. Idea Grew · 8. Vision · 9. Live Demo transition · 10. Connected Knowledge (diagram) · 10a. Topic page screenshot · 11. Offline First · 12. Reading to Learning · 13. CFD Formation · 14. Reference Library · 15. Etymology · 16. CFD Resources · 17. Admin & Analytics · 18. Architecture · 19. Why This Architecture · 20. Current Cost · 21. When Do We Upgrade · 22. Future Cost Model · 23. Roadmap · 24. What iCFD Is Not · 25. Closing (A Tool to Support Our Educators) + Q&A.

Slide 10 was split into two (10 + 10a) versus the source doc's single slide, to give the knowledge-graph diagram and the real topic-page screenshot each their own frame rather than cramming both onto one.

## Demo sequence (slide 9)

Home → Learn (a topic) → Search → References (Library) → Learning Progress (Paths) → Offline (disable network, reopen a cached topic). Matches the source doc's specified journey; do not free-click through features.

## Screenshots used (real, captured live)

`home`, `library`, `topic-detail` (`creation-and-evolution`), `search`, `paths`, `bible`, `catechism`, `handbook`, `topic-mobile` (414×896 viewport). All captured from the actual running app, not mockups.

## Screenshots deliberately NOT used — needs your input

- **Admin analytics** (`/admin/analytics`) and **Account/certificates** (`/account`) both hit an auth wall when captured headlessly (no admin session available). Rather than fake these, slide 17 (Admin & Analytics) and slide 12 (Reading to Learning / certificates) use diagrams and badges only, no screenshot. **If you want real screenshots here, either supply your own or give me a way to authenticate a demo/admin session and I'll recapture.**
- **Problem video** (slide 5): originally left as an explicit placeholder (no video file exists in the repo). Per round-5 feedback, removed entirely — slide 5 now states the problems directly instead of deferring to a video.

## Corrections made against the source markdown

1. **Brand colors**: the source doc said "red/yellow accents." The actual codebase (`app/globals.css`) defines the real CFD brand palette as **navy `#10182F`, blue `#1557A6`, gold `#F2D21F`** — no red exists anywhere in the app's theme. Built the deck on the real palette instead of inventing a red that isn't there.
2. **Certificates are PNG, not PDF.** No PDF library exists in `package.json`; certificate "download" is a canvas-rendered PNG image (`lib/download/certificateExport.ts`). Slide language avoids implying a PDF certificate.
3. **Pricing**: you confirmed both Vercel and Supabase are on free tiers — slide 20 states this directly rather than using a bracketed placeholder. Domain cost and "other services" remain `[INSERT ...]` placeholders since those weren't confirmed.
4. **Geo-analytics dashboard** (the MapLibre heatmap under `/admin/analytics`) is uncommitted, in-progress work as of this build — labeled "in active development," not "implemented."

## Current vs. planned — labeling used throughout

- **Implemented** (green badge): PWA/offline, search, topic/reference content, quiz → certificate pipeline end-to-end, admin CRUD suite, learning paths UI.
- **Partially implemented** (amber badge): CFD-wide resource/formation infrastructure (foundations exist, org-wide rollout doesn't), geo-analytics dashboard, full quiz question bank for all 20 course topics.
- **Planned/future** (no badge, framed as "direction"): CFD Davao stage, organization-wide rollout, paid infrastructure tiers, chapter formation support.

## Revision log

- 2026-08-30 (round 2): Removed all "Codex Defensoris" references — title slide and slide 8 now read plain "iCFD" per user request to focus branding on iCFD alone. Title-slide role line changed to "Lead Software Architect / Engineering." Slide 3 ("My Journey") stripped of all narrative body text — now shows only the headline and the Questions → Study → Apologetics → CFD → iCFD flow diagram, enlarged and centered; presenter narrates the story live. All three formats (HTML/PDF/PPTX) rebuilt and re-validated (no overflow, no broken images).
- 2026-08-30 (round 3): Removed the old slide 25 ("Mission" — the "Technology Is the Instrument" cover slide) entirely per user request. Rewrote the old slide 26 (Q&A) into a single new closing slide 25, "A Tool to Support Our Educators" — deliberately avoids the "does not replace priests/catechists" framing used on slide 24/the old Mission slide, and instead frames iCFD positively as a tool that gives educators a focused way to deliver guided content and a new, data-driven way to evaluate member learning. Kept the Q&A floor-opening line at the bottom of this same slide rather than adding back a separate Q&A slide. Deck is now 26 slides total. All three formats (HTML/PDF/PPTX) rebuilt and re-validated (no overflow, no broken images, 26 slides confirmed).
- 2026-08-30 (round 4): Replaced the slide 10a topic-page screenshot with a live capture of `/bible-tradition-authority?path=basic-apologetics-course` rendered in **Cebuano**, per user request. Slide title updated to "A Real Topic Page — in Cebuano." Capture required setting both the `lang` cookie (read server-side by `app/[topic]/page.tsx`) and the Zustand `app-store` localStorage key (`currentLanguage: 'ceb'`) before navigating — the cookie alone produces correct SSR HTML, but the client-side store defaults to English and overwrites the language after hydration if not also seeded. Verified server-side via `curl` against the live dev server and a DB query (Supabase `topics` table, `lang='ceb'` row, `translation_source='manual'`, `published=true`) before trusting the rendered screenshot. All three formats rebuilt and re-validated (no overflow, no broken images, 26 slides).
- 2026-08-30 (round 5): Removed the problem-video placeholder on slide 5 per user request (no video will be shown). Replaced it with a direct content slide, "Five Problems iCFD Was Built to Address" — scattered sources, no guided starting point, no measurable way to evaluate member learning, no focused tool for educators/catechists, and gaps in offline/local-language access. Slide count unchanged (26); no longer references a missing video asset. All three formats rebuilt and re-validated (no overflow, no broken images).

## Assumptions

- Speaker will drive slide 9's demo live rather than the deck containing embedded interactive elements.
- `[INSERT CURRENT DOMAIN COST]` and `[INSERT IF ANY]` (slide 20) are the only remaining unconfirmed pricing placeholders — fill in before presenting, per your instruction not to invent prices.
- The `.pptx` uses Arial as a widely-available font substitute; swap in a CFD-branded font if one exists before final polish.

## Validation performed

- Automated: all `<img>` tags resolved (no broken images); no slide's content overflows the 1280×720 frame (checked via headless Chromium `scrollHeight` against `clientHeight` for every slide — fixed 4 slides that initially overflowed).
- Manual: visually spot-checked 8 slides (title, problem, knowledge graph, offline, CFD formation, admin/analytics, cost table, mission) via rendered screenshots — typography, spacing, and brand colors read cleanly at 16:9.
- Not yet done: full slide-by-slide visual pass of the `.pptx` file (no local PowerPoint/LibreOffice); projector-distance readability check; print-quality check of the PDF.
