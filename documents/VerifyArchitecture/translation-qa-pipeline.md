# Translation QA Pipeline (Token-Optimized)

## Goal
Evaluate translation quality (Tagalog/Cebuano and other SEA languages) — specifically Catholic apologetics/CFD material — across candidate models without routing every review round through Claude.

**Content note:** source material contains doctrinal/theological content (Bible quotations, apologetic arguments, structured Q&A on topics like Trinity, Eucharist, Petrine Primacy, etc.). Generic translation metrics (fluency, naturalness) are insufficient alone — a translation can be fluent and still theologically wrong. This pipeline treats doctrinal fidelity as a distinct, higher-priority axis from general translation quality.

## Models Involved

| Model | Role | Status |
|---|---|---|
| `qwen3.6:35b-mlx` | Judge — structure/consistency, rubric-following | Downloaded |
| `sailor2:20b-chat-q8_0` | Judge — regional naturalness/fluency (Cebuano, Tagalog, Waray, etc.) | Downloaded (confirmed 2026-08-13) |
| Claude | Final adjudicator — only on flagged/sampled cases | N/A |
| Translation candidates (e.g. `sailor2:20b`, `gemma-sea-lion`, others being tested) | Producing the translations under review | As needed |

**Why two local judges, not one:** Qwen3.6-35B is the stronger general reasoner (rubric adherence, consistent structured scoring), but has no dedicated regional-language training. Sailor2 is specifically trained on Cebuano/Tagalog/Waray and is better positioned to judge whether output actually sounds natural to a native reader. They check different things — neither substitutes for the other.

## Pipeline

```
                 SOURCE (translated candidate)
                         │
                         ▼
          ┌──────────────────────────┐
          │ Tier 0: Deterministic QA │  ← zero tokens, zero compute cost worth mentioning
          ├──────────────────────────┤
          │ • Bible reference check  │  (Jn. 5:39 preserved, not altered/dropped/moved)
          │ • Terminology dictionary │  (Espiritu Santo, Iglesya, Tradisyon, etc.)
          │ • Numbers / proper nouns │
          │ • Formatting/placeholders│
          └────────────┬─────────────┘
                        │
                        ▼
          Tier 1: chrF++ (if reference exists)
                 screening signal only — NOT a quality score
                        │  zero Claude tokens, local compute only
                        ▼
          ┌──────────────────────────┐
          │ Tier 2: Local LLM Judges │
          ├──────────────────────────┤
          │ qwen3.6:35b-mlx          │  → semantic accuracy, doctrinal fidelity,
          │  (reasoning/rubric)      │    biblical fidelity, consistency
          │                          │
          │ sailor2:20b              │  → fluency, naturalness, idiom,
          │  (SEA fluency)           │    regional usage
          └────────────┬─────────────┘
                        │  zero Claude tokens, local compute only
                        ▼
                 Decision Engine
              (dimension-level comparison,
               not just averages — see below)
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
        PASS         REVIEW         FAIL
          │             │             │
          │             ▼             │
          │     Tier 3: Claude        │
          │     (batched, stratified  │
          │      sample — see below)  │
          │             │             │
          └─────────────┴─────────────┘
                        │
                        ▼
                  FINAL RESULT
                        │
                        ▼
          Periodic: Human/expert golden-set
          → calibrate Qwen & Sailor2 accuracy
            (see Calibration Loop below)
```

## Token Optimization Rules
1. **Never send every translation to Claude.** Only flagged cases (disagreement, low score, or critical error) or a stratified sample — not a flat random 15–20/250 (see Stratified Sampling below).
2. **Batch Claude calls.** One message containing 10+ translation pairs to score, not 10 separate calls — amortizes fixed prompt/instruction overhead.
3. **Local judges run first, always.** They're free of Claude-token cost per call (local compute isn't literally free, but it's off your Claude quota entirely); let them do the bulk filtering before Claude is involved at all.
4. **Only use chrF++ when a reference translation exists.** Skip straight to Tier 2 (local judge) when there's no ground truth to score against — and even when it exists, treat it as a screening signal, not a quality verdict (see below).
5. **Deterministic checks (Tier 0) run before any LLM — including local judges.** Bible references, terminology, numbers, and formatting are checkable with code, not inference. This costs nothing in tokens or meaningful compute and catches an entire class of errors before either judge model is invoked.

## Rubric for Local Judges

Do not collapse this into a single overall score. Use dimension-level output, structured (JSON) so results are parseable without an LLM re-reading them:

```json
{
  "accuracy": 5,
  "doctrinal_fidelity": 5,
  "biblical_fidelity": 4,
  "fluency": 5,
  "naturalness": 4,
  "terminology": 5,
  "critical_error": false,
  "issues": [],
  "verdict": "PASS",
  "confidence": 0.91
}
```

**Dimensions:**
1. Semantic Accuracy
2. **Doctrinal Fidelity** — does the translation preserve the theological claim, not just the general sense (a translation can be fluent and doctrinally wrong — e.g. subtly shifting emphasis between Scripture and Tradition, overstating or understating a doctrinal claim)
3. **Biblical Reference Fidelity** — reference preserved, not altered/omitted/misattributed (cross-check against Tier 0's deterministic extraction)
4. Fluency
5. Naturalness / idiom (Sailor2's specific strength)
6. Terminology Consistency (cross-check against Tier 0's dictionary)

**Critical error override:** one catastrophic error (e.g. doctrinal_fidelity: 2, even if every other dimension scores 5) should force a FAIL/REVIEW regardless of average score. Don't let a high average mask a single serious failure.

**Confidence field:** route on confidence, not just PASS/FAIL —
```
HIGH CONFIDENCE PASS  → done
LOW CONFIDENCE        → Claude
DISAGREEMENT          → Claude
CRITICAL ERROR        → Claude
```

Keep the judge prompt short and the output strictly structured — this keeps local inference fast and avoids ambiguous, hard-to-parse responses.

## Dimension-Level Disagreement (not average-level)
Compare Qwen vs. Sailor2 **per dimension**, not just their overall scores — two judges can land on the same average while disagreeing sharply on the dimension that actually matters:
```
             Qwen    Sailor2
Accuracy      5         3
Fluency       5         5
Naturalness   5         5
Doctrine      5         2      ← flag, even though fluency/naturalness agree
```
Flag rule: `if abs(qwen_score - sailor_score) >= 2 on any dimension: FLAG`. A plain "if different" threshold over-flags and defeats the point of local filtering.

## Deterministic Pre-Checks (Tier 0 detail)
- **Bible references** — extract citations (e.g. `Jn. 5:39`, `2 Tim. 3:16-17`) and verify: reference preserved, verse text not silently altered, no omission, no reference moved to the wrong statement. Deterministic, not an LLM judgment call.
- **Terminology dictionary** — maintain fixed-term mappings (e.g. Holy Spirit → Espiritu Santo, Church → Iglesya/Simbahan, Tradition → Tradisyon, Magisterium → Magisterium/Magisteryo) and flag when expected terminology is missing or substituted inconsistently.
- Both run as plain code, not inference — essentially free, and catch failures the LLM judges might read past because the surrounding sentence still sounds fluent.

## Content Risk Tiering
Not all content warrants the same Claude review rate. Assign risk level and scale sampling accordingly:

| Risk | Content type | Claude review rate |
|---|---|---|
| Low | General introductions | 2–5% |
| Medium | Historical explanations | 5% |
| High | Doctrinal definitions | 10% |
| Very High | Biblical quotations, dogmatic claims, apologetic arguments, sacramental theology, salvation-related claims | 20–30% |

## Stratified Sampling (replaces flat random sampling)
Don't pull a flat random 15–20 out of 250. Stratify:
- Some highest-confidence PASS (sanity check the judges aren't rubber-stamping)
- Some borderline PASS
- Some disagreement cases
- Some random baseline
- Weighted toward Very High risk content regardless of judge verdict

This surfaces **systematic judge failures** a flat sample would miss — e.g. if Sailor2 consistently passes fluent-but-doctrinally-wrong translations, only targeted sampling against high-risk content reveals the pattern.

## Calibration Loop (ongoing, not one-time)
Don't treat Claude only as a final oracle — use its verdicts to measure and improve the local judges over time:
1. Periodically build a golden set (e.g. 100 Cebuano / 100 Tagalog / 50 Waray) reviewed by a native speaker or subject-matter expert if available, plus Claude, plus Qwen, plus Sailor2.
2. Compare each judge's verdict against the expert/Claude verdict — compute precision/recall per judge.
3. Use this to learn each judge's actual failure pattern, e.g. "Sailor2 is strong on fluency but frequently misses doctrinal errors" or "Qwen over-flags naturally-phrased Cebuano." That's more actionable than a single average score.
4. **Don't assume Sailor2 judges Cebuano better just because it's SEA-specialized** — that's a hypothesis this calibration loop tests, not something to take for granted.
5. The question this loop answers isn't "which judge scores highest" — it's **which judge best predicts expert/Claude judgment**, dimension by dimension.

## What Not To Do
- Don't send every translation round to Claude — defeats the purpose of local delegation
- Don't skip local judges and go straight to Claude "to be safe" — that's the expensive path this pipeline exists to avoid
- Don't rely on Qwen3.6 alone to judge regional naturalness — it has no dedicated Cebuano/Tagalog training
- Don't call Claude once per item — batch flagged/sampled items into a single call
- Don't run `sailor2:20b` and a Qwen3.6 variant loaded simultaneously — respect one-model-at-a-time on 36GB; sequential evaluation costs less than the memory pressure/swapping risk of loading both
- Don't collapse judge output into a single overall score — dimension-level scoring is what makes disagreement detection and critical-error override possible
- Don't use flat random sampling for the Claude review set — stratify, and weight toward high-risk theological content
- Don't treat chrF++/BLEU as a quality verdict — lexical overlap can be high even when a translation is theologically wrong; treat it as a screening signal only
- Don't assume Sailor2 is the better Cebuano/Tagalog judge without testing it against a golden set — that's a hypothesis, not a given
- Don't treat Claude only as a final oracle — periodically use its verdicts to calibrate and diagnose the local judges' actual failure patterns

## Open Items
- Terminology dictionary not yet built — needs actual term list from the CFD material (Espiritu Santo, Iglesya, Tradisyon, Magisterium, etc.)
- Bible-reference validator not yet built — deterministic extraction + verification logic
- Golden set for calibration not yet created — needed to measure judge precision/recall against expert/Claude judgment
- COMET worth testing if language/model support is adequate, but not mandatory — chrF++ is an acceptable minimum for Cebuano
