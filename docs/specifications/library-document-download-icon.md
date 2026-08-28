---
schema_version: 1
id: library-document-download-icon
title: Download icon for every Library resource
type: feature
status: done
priority: medium
owners: [earlrodson]
estimate_hours: 4
hours_logged: 4
created: 2026-07-26
updated: 2026-07-28
prd_ref: docs/specifications/library-document-download-icon.md
---

## Description
Every Library resource (Church Documents, the Bible, Catechism, GIRM, and
Canon Law) gets a download icon that assembles the full text client-side
and saves it as a `.txt` file via Blob, reusing each reader's existing
fetch/pagination logic and the same download trick already used for
favorites export.

## Traceability & Strategic Intent
- **Outcome Alignment:** Increase offline/portable access to Library content.
- **Strategy Intent:** Readers who want to study or share a document outside
  the app.
- **Execution Intent:** Documents live as plain-text rows in Postgres with no
  backing file, so there was no existing download path.
- **Benefit Hypothesis:**
  - *By implementing:* a client-side text export per document.
  - *We will improve:* offline reading and sharing of Library content.
  - *As measured by:* download icon usage on Library resources.

## Product Context
- **Customer Context:** Readers of Church Documents, Bible, Catechism, GIRM,
  and Canon Law who want a local copy.
- **Operating Context:** Next.js app, documents stored as plain text in
  Postgres (no backing file).
- **Ecosystem Context:** Reuses the existing favorites-export Blob download
  trick; no external APIs.
- **Regulatory Context:** GIRM/Canon Law icons only appear once signed in,
  matching the existing locked-resource gating.

## Behavior Specifications

```gherkin
Scenario: Signed-out reader downloads a public document
  Given a reader is viewing a Church Document, the Bible, or the Catechism
  When they click the download icon
  Then the full document text downloads as a .txt file

Scenario: Signed-out reader views a locked document
  Given a reader is signed out and viewing the GIRM or Canon Law
  When the page renders
  Then no download icon is shown

Scenario: Signed-in reader downloads a locked document
  Given a reader is signed in and viewing the GIRM or Canon Law
  When they click the download icon
  Then the full document text downloads as a .txt file
```

## Acceptance criteria
- [x] All 15 Church Documents, the Bible, and the Catechism show a download
      icon regardless of sign-in state
- [x] GIRM and Canon Law only show the download icon when signed in
- [x] Download assembles the full document text client-side and saves it as
      a `.txt` file via Blob

## Todos
- [x] Add download icon + Blob export to the Library reader (@earlrodson, est 4h, due 2026-07-28)

## Daily log
- 2026-07-28 (@earlrodson, 4h): Shipped download icon across all Library
  resources; merged in #7.

## Decisions & risks
- Reused the favorites-export Blob download trick instead of introducing a
  backing file per document, since documents already live as plain-text
  Postgres rows.

## Links
- PR: https://github.com/earlrodson/iCFD/pull/7
- Branch: claude/library-document-download-icon-8vdszy
