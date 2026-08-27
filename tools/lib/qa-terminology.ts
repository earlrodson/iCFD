/**
 * Shared fixed-term dictionary for Tier 0 translation QA (see
 * documents/VerifyArchitecture/translation-qa-pipeline.md). Used by both
 * validate-translation.ts (translate-topic.ts pipeline) and
 * validate-translation-legacy.ts (handbook.json seed).
 */
export const TERMINOLOGY: { en: RegExp; expected: Record<'ceb' | 'tl', RegExp> }[] = [
  { en: /\bHoly Spirit\b/i, expected: { ceb: /\b(Espiritu Santo|Balaang Espiritu)\b/i, tl: /\b(Espiritu Santo|Banal na Espiritu)\b/i } },
  { en: /\bChurch\b/, expected: { ceb: /\b(Simbahan|Iglesya)\b/i, tl: /\b(Simbahan|Iglesia)\b/i } },
  { en: /\bTradition\b/, expected: { ceb: /\bTradisyon\b/i, tl: /\bTradisyon\b/i } },
  { en: /\bCatechism\b/, expected: { ceb: /\bKatesismo\b/i, tl: /\bKatesismo\b/i } },
  { en: /\bMagisterium\b/, expected: { ceb: /\bMagisterium|Magisteryo\b/i, tl: /\bMagisterium|Magisteryo\b/i } },
  { en: /\bGospels?\b/i, expected: { ceb: /\bEbanghelyo\b/i, tl: /\bEbanghelyo\b/i } },
  { en: /\bApostles?\b/i, expected: { ceb: /\bapostol(es)?\b/i, tl: /\bapostol/i } },
]

export function checkTerminology(lang: 'ceb' | 'tl', enText: string, trText: string): { term: string; issue: string }[] {
  const flagged: { term: string; issue: string }[] = []
  for (const { en, expected } of TERMINOLOGY) {
    const enHits = enText.match(en)
    if (!enHits) continue
    const re = expected[lang]
    if (!re.test(trText)) {
      flagged.push({ term: en.source, issue: `EN term present (${enHits.length}x) but expected translation not found in ${lang} text` })
    }
  }
  return flagged
}
