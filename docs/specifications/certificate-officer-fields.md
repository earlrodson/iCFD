---
schema_version: 1
id: certificate-officer-fields
title: Configurable certificate officer names, issue date & sequence number with drag-to-position admin UI
type: feature
status: done
priority: medium
owners: [earlrodson]
estimate_hours: 4
hours_logged: 4
created: 2026-08-28
updated: 2026-08-28
---

## Description
Course-completion certificates only rendered the recipient's name onto the
background image. This feature adds three more fields to every certificate —
issue date, certificate ID (sequence/serial number), and the National
President / National Spiritual Adviser names — and replaces the old
manually-typed x/y placeholder config with a drag-to-position admin UI, using
`public/certificates/default-template.jpeg` as the new default background.

## Traceability & Strategic Intent
- **Outcome Alignment:** Certificates read as institutionally authentic (signed
  by named officers, dated, uniquely numbered) rather than a bare name overlay.
- **Strategy Intent:** Learners completing a path/tier — certificate is the
  tangible proof-of-completion artifact they keep/share.
- **Execution Intent:** Admin needed a way to add new certificate fields and
  reposition all of them per template without hand-editing JSON coordinates.
- **Benefit Hypothesis:**
  - *By implementing:* multi-field placeholder rendering + a draggable admin
    preview
  - *We will improve:* certificate completeness/credibility and admin
    iteration speed on template layout
  - *As measured by:* zero hand-authored placeholder JSON edits needed going
    forward; time to reposition a field on a new template upload

## Product Context
- **Customer Context:** Learners viewing/downloading a certificate from
  `/account` (certificate album + modal); admins configuring templates at
  `/admin/certificates` and org officer names at `/admin`.
- **Operating Context:** Next.js App Router + Supabase (Postgres/Storage).
  `certificate_templates` (path_slug, tier) stores `base_image_url` +
  `placeholders` jsonb; `site_config` stores global key/value app settings.
- **Ecosystem Context:** No external APIs — purely internal rendering
  (`CertificatePreview`) driven by DB-stored coordinates.
- **Regulatory Context:** None — no PII beyond the learner's own display name,
  already shown pre-feature.

## Behavior Specifications

```gherkin
Scenario: Certificate renders all four new fields with real data
  Given a learner has an earned certificate for a path/tier
  And National President and National Spiritual Adviser names are set in App Config
  When the learner opens the certificate modal or account album thumbnail
  Then the certificate shows the recipient name, issue date (YYYY-MM-DD),
    certificate ID (serial_code), and both officer names
    at the positions stored in that template's placeholders

Scenario: Field position defaults when a template has none saved yet
  Given a (path_slug, tier) has no certificate_templates row
  When a certificate for that path/tier is rendered
  Then it falls back to DEFAULT_BASE_IMAGE_URL (default-template.jpeg)
    and DEFAULT_PLACEHOLDERS positions for all five fields

Scenario: Admin repositions a field by dragging
  Given an admin is viewing /admin/certificates for a path/tier
  When they drag the "Certificate ID" field to a new spot on the preview image
  Then the field follows the pointer and the "Save positions" button becomes enabled
  When they click "Save positions"
  Then PATCH /api/admin/certificates/placeholders persists the new placeholders array
    and the button shows "Saved!"

Scenario: Officer names not yet configured
  Given certificate_national_president or certificate_national_spiritual_adviser
    is empty in site_config
  When an admin opens /admin/certificates
  Then a warning banner links to /admin (App Config) to set them
```

## Acceptance criteria
- [x] `default-template.jpeg` is the default certificate background
      (`DEFAULT_BASE_IMAGE_URL`)
- [x] Certificate renders: recipient name, issue date (`YYYY-MM-DD`),
      certificate ID (existing `certificates.serial_code`, no new counter),
      National President name, National Spiritual Adviser name
- [x] National President / National Spiritual Adviser are global (site-wide),
      one setting each, stored in `site_config`, editable via the existing
      generic App Config UI at `/admin` — no new admin form built for them
- [x] `/admin/certificates` preview supports dragging any field to a new
      position and saving via a dedicated endpoint, independent of re-uploading
      the background image
- [x] Templates saved before this feature (single `name` placeholder only)
      continue to render correctly — missing fields fall back to
      `DEFAULT_PLACEHOLDERS` per-field, not by discarding the whole array
- [x] `pnpm lint && pnpm type-check && pnpm test` green

## Todos
- [x] Add `issue_date`/`serial_code`/`national_president`/`national_spiritual_adviser` to `lib/content/certificateTemplate.ts` with default positions and a merge-with-fallback resolver (@earlrodson, est 1h, done 2026-08-28)
- [x] Generalize `CertificatePreview` to render N fields and support drag repositioning (@earlrodson, est 1h, done 2026-08-28)
- [x] Add `PATCH /api/admin/certificates/placeholders` and wire `/admin/certificates` drag UI + save action (@earlrodson, est 1h, done 2026-08-28)
- [x] Seed `site_config` rows for the two officer names via migration; wire through `useSiteConfig`, `CertificateModal`, and the account-page album (@earlrodson, est 1h, done 2026-08-28)

## Daily log
- 2026-08-28 (@earlrodson, 4h): Implemented multi-field certificate rendering (issue date, serial code, officer names), drag-to-position admin UI with a new placeholders PATCH endpoint, and global officer-name config via site_config; updated default template to default-template.jpeg; lint/type-check/test all green.

## Decisions & risks
- Certificate sequence # deliberately reuses the existing `certificates.serial_code` rather than a new configurable counter/format — avoids a second source of truth for the same concept.
- National President / National Spiritual Adviser are global (one name each, site-wide) rather than per-path/tier — matches these being real, singular org officers, and reuses the existing generic App Config editor instead of a bespoke admin form.
- Exact on-image coordinates were deliberately left as reasonable starting defaults rather than hand-tuned, since the drag UI is the mechanism for admins to fine-tune final placement — no further coordinate-guessing work is needed here.

## Links
- PR:
- Branch:
