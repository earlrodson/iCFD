# Token Optimization Workflow — How It Actually Works

_Last audited: 2026-07-27, during a live session. Updated same day after building four new hooks to close the gaps found below._

This documents what's **enforced by tooling** (hooks/hard-blocks) vs. what's a
**convention I (the assistant) must self-apply** (no technical enforcement) —
plus the lapses observed this session and where to invest next.

## What runs automatically — no user command needed

| Mechanism | Trigger | Enforcement |
|---|---|---|
| Grep nudge → semantic search suggestion | Any `Bash` call matching `grep -r`/`rg`/`find -name *.ts` etc. | **Soft nudge, downgraded from hard block 2026-08-03** (`PreToolUse` hook, `~/.claude/hooks/nudge-direct-grep.sh` → `detect-codebase-grep.py`). Suggests semantic search for fuzzy/conceptual queries but no longer blocks — grep/rg remain the right tool for exact-match lookups (symbol names, error strings, config keys) per the CLAUDE.md audit checklist §4. Command always runs. Pipeline grep (`git log \| grep`) and single-file grep are allowlisted through without a nudge. |
| Vector index refresh | Every `git commit` | **Hard automatic** — `.git/hooks/post-commit` runs `bun tools/vector-index.ts` unconditionally. No manual `pnpm run index` needed after a commit. |
| Large full-file read nudge | Any `Read` with no `limit`/`offset` on a file >400 lines | **Soft nudge only** (`nudge-large-read.sh`) — shows a suggestion to delegate to search/Explore, does not block. |
| Diff-vs-rewrite nudge | Any `Write` targeting an existing file >400 lines | **Soft nudge, new 2026-08-03** (`nudge-diff-vs-rewrite.sh`) — suggests `Edit` instead of a full-file `Write` for localized changes. Targets output tokens (~18% of weighted cost per the cost breakdown below) — the smallest lever of the three identified, but cheap to add. Mirrors `nudge-large-read.sh`'s pattern; never blocks. |
| Large-output command nudge | `bun/pnpm/npm build`, `tsc`, `test`, `install` without a pipe to `head`/`tail`/`grep` | **Soft nudge only** (`nudge-large-output.sh`) — suggests piping through `tail -80` etc., does not block. |
| Ollama model loading | First `ollama_chat`/`ollama_generate`/`/api/embed` call to a given model name | Automatic **at the Ollama daemon level** — lazy-loads on first request, unloads after ~5 min idle. Not related to Claude Code hooks at all. |
| Global tool allowlist for Ollama | N/A | `~/.claude/settings.json` pre-allows `ollama_generate/chat/list/ps` — no permission prompt interrupts the routing decision once I choose to call it. |
| Ollama Q&A routing nudge | Any `UserPromptSubmit` matching explain/summarize/decode/AC-extraction/commit-msg-draft phrasing, without file/code refs | **Soft nudge, new 2026-07-27** — `~/.claude/hooks/nudge-ollama-qa.sh` injects a reminder into context to route to `ollama_chat`/`qwen3.5:9b` before I respond. Doesn't block; I can still choose to answer directly if the task turns out to need project context. |
| Lookup-delegation nudge | Any `UserPromptSubmit` matching "where is X" / "does Y exist" / "find the Z" style phrasing, without implementation verbs | **Soft nudge, new 2026-07-27** — `~/.claude/hooks/nudge-lookup-delegation.sh` suggests `vector-search.ts` (if the project has one) or the search/Explore agent. |
| Ollama-routing compliance tally | End of every assistant turn (`Stop`) | **Soft self-report, new 2026-07-27** — `~/.claude/hooks/nudge-ollama-tally.sh` + `ollama-tally.py` rescan the transcript for flagged-but-unrouted prompts and print only newly found lapses (state tracked per-session in `~/.claude/hooks/.state/`). **Same-session early warning only** — resets every session. The `session-audit-calibration` memory (updated manually via `/session-audit`) is the authoritative cross-session miss-count record; if the two ever disagree, trust the memory. |
| Post-commit index-rebuild failure signal | `.git/hooks/post-commit` non-zero exit from `bun tools/vector-index.ts` | **Hard automatic, new 2026-07-27** — now checks the exit code and fires a macOS notification + stderr line if the rebuild fails, instead of failing silently. |

## What requires an explicit decision (not enforced by any hard block)

| Convention | Where documented | Enforcement |
|---|---|---|
| Route self-contained Q&A (explain error, summarize snippet, AC extraction, commit msg draft) → `ollama_chat` `qwen3.5:9b` | `~/.claude/CLAUDE.md` routing table | **Soft nudge as of 2026-07-27** (see table above) + self-report tally. This is the one that lapsed this session before the hooks existed. |
| Route grep/find/"where is X" → `search` agent (Haiku) or `vector-search.ts` | Same table / project `CLAUDE.md` | **Soft nudge as of 2026-07-27** (lookup-delegation hook) — still not a hard block; I can act on or ignore the injected context. |
| Escalate ambiguous/failed lookups from Ollama → Haiku/Sonnet | Global CLAUDE.md | **None.** Self-judgment only — no hook covers this yet. |

## Cost visibility

| Mechanism | Trigger | Enforcement |
|---|---|---|
| Cost report | Manual — `python3 ~/.claude/scripts/cost-report.py [--since-hours N] [--by-project] [--intro]` | **Not automatic — no hook runs this.** Sums real spend from `~/.claude/projects/**/*.jsonl` `usage` fields (`input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`) per model, priced from the cached rate table in the `claude-api` skill (Sonnet 5 $3/$15 per MTok standard, $2/$10 intro through 2026-08-31; Opus 4.8 $5/$25; Haiku 4.5 $1/$5; cache write 1.25×, cache read 0.1× of input). Non-priced models (local Ollama, `<synthetic>`) are excluded from cost but still counted in tokens. This is the measurement layer the other nudges were guessed at without — added 2026-08-03. |

**First reading (2026-08-03, 6-hour window, this session): ~$37, weighted breakdown.** Unit price is misleading here — weight each line by volume × multiplier, not sticker price:

| Line | Volume | Multiplier | Weighted share |
|---|---:|---:|---:|
| Cache read | 69.6M tokens | 0.1× | ~58% |
| Cache write | 2.3M tokens | 1.25× | ~24% |
| Output | 437K tokens | 5× vs. input | ~18% |

Cache reads are cheap *per token* but dominate by volume (~30× everything else combined) — they're the actual cost driver, not a rounding error. Cache reads accrue as roughly *context size × turn count* (the cached prefix gets re-read every turn), so the lever that matters most right now is persistent context size and turn count, not output length or model choice. This directly validates the earlier CLAUDE.md audit work (trimming stale/temporal content out of the always-loaded files) and reorders the nudge backlog:

- ✅ **Diff-vs-rewrite nudge** (built 2026-08-03, `nudge-diff-vs-rewrite.sh`) targets output — ~18% of weighted cost. Cheap to add, but the smallest lever.
- **Escalation nudge** (not yet built, Ollama→Haiku/Sonnet) affects all lines via model choice, but has the worst detection story (see below).
- **Neither touches the ~58%.** `/compact` discipline, trimming per-turn context (skill/MCP schema weight, avoiding unnecessary full-file reads), and shorter sessions are what actually move that number. Run `/context` on a live session to see the real per-turn floor — that number × turn count is most of the bill.

One reading is a data point, not a verdict — treat this as a trend line to re-check with `--since-hours`, not a signal to force brevity. $37 for six hours of substantive engineering work may be perfectly good value; don't let a single number push toward false economy.

## CLAUDE.md audit tooling (2026-08-03)

`~/.claude/scripts/claude-md-tokencheck.py [files...] [--exact] [--model]` automates Step 0 of `documents/claude-md-audit-checklist.md` — token-counts CLAUDE.md files and flags 🟢/🟡/🔴 tier per the checklist's own thresholds. Offline proxy by default (`word_count * 1.35`, matches the checklist's own formula); `--exact` calls the real `count_tokens` endpoint if `ANTHROPIC_API_KEY` is set. Default targets: `~/.claude/CLAUDE.md` and `./CLAUDE.md`.

Deliberately scoped to just this: the rest of the checklist (red flags, duplication, contradiction, severity scoring) needs judgment a script can't do reliably, and the checklist's only been run once by hand so far — not enough repeats yet to justify automating the qualitative parts. Revisit if it's run 2-3 more times and a mechanical pattern emerges. `/session-audit` is a separate tool (Part B — runtime routing behavior), not a substitute for this.

## MCP server scoping (2026-08-03)

`~/.claude.json` → `projects["/opt/homebrew/var/www/iCFD"].disabledMcpServers` now includes `azure-devops`, `openpencil` (pre-existing), and `pencil` — none used in this project, and they were loading tool schemas into every session's context regardless (part of the ~83k-token deferred-MCP-schema weight found via `/context`). `supabase` stays enabled (project-local `mcpServers` entry, actively used). Gmail/Calendar/Drive connectors are **not** in `mcpServers` at all — they're Claude.ai account-level connectors, not project-scriptable this way, so that portion of the schema weight isn't fixable from here. Takes effect next session start, not the one that made the change (servers are already loaded for the current session).

## AGENTS.md bleed (investigated 2026-08-03, closed — no fix, cost confirmed negligible)

`/opt/homebrew/CLAUDE.md` → `@AGENTS.md` loads into every iCFD session because iCFD lives nested at `/opt/homebrew/var/www/iCFD` — a separate git repo, but Claude Code's CLAUDE.md discovery walks every ancestor directory to filesystem root regardless of git boundaries, with no per-ancestor opt-out. The only discovery-disabling flag (`--simple` / `CLAUDE_CODE_SIMPLE=1`) is all-or-nothing and would also drop iCFD's own CLAUDE.md, so it's not usable. The content itself is real (Homebrew's own contributor instructions), just irrelevant to iCFD.

User declined relocating the project directory (the only structural fix). Left as-is: the file is static, so it's a one-time ~2.5k-token cache write per session (~$0.006 at Sonnet 5 rates) then cheap cache-reads thereafter (~$0.0005/turn) — negligible against the ~58%-from-cache-reads finding above, which is driven by conversation length, not this. Don't re-investigate without new evidence.

## Lapses this session

1. **Direct answer instead of Ollama routing.** Asked to "explain what this error means" (a textbook self-contained Q&A case per the routing table) — I answered directly from the main session instead of calling `ollama_chat` with `qwen3.5:9b`. No hook catches this class of miss because model routing has zero technical enforcement; it depends entirely on me reading and applying the table each time. Caught by user, corrected, saved as [feedback memory](../../../Users/earlrodsoncarino/.claude/projects/-opt-homebrew-var-www-iCFD/memory/feedback_ollama_routing.md).
2. **Went to grep before semantic search.** When checking whether `nomic-embed-text` was referenced in `tools/`, I ran `grep -rn` directly instead of trying `bun tools/vector-search.ts` first, per the project rule "use this before any grep, find, or Explore agent call." The hard-block hook caught the recursive grep and redirected me — but I only fell back to a manual single-file `grep` (allowlisted, since it's not recursive) rather than the semantic search tool the rule actually asks for. No memory saved yet for this one — noted here as a candidate if it recurs.

## Long-term improvements — status

All four identified gaps were closed same-day (2026-07-27):

- ✅ **Ollama Q&A routing nudge** — `nudge-ollama-qa.sh` (`UserPromptSubmit`).
- ✅ **Lookup-delegation nudge** — `nudge-lookup-delegation.sh` (`UserPromptSubmit`), covers both the vector-search-first case and the agent-delegation case via a branch on whether the project has `tools/vector-search.ts`.
- ✅ **Ollama-routing compliance visibility** — `nudge-ollama-tally.sh` + `ollama-tally.py` (`Stop`), self-reports newly-found lapses per session without repeating old ones.
- ✅ **Post-commit index failure signal** — `.git/hooks/post-commit` now checks exit code and notifies on failure.

Still open, lower priority (soft nudges are not hard blocks, so all of the above can still be silently ignored if the injected context doesn't change my behavior — worth re-auditing after a few more sessions to see if the nudges actually work or if this needs to escalate to something stronger):

- No hard block exists for model routing, lookup delegation, or (as of 2026-08-03) grep/rg/find — all three are soft nudges now, by design: reliably distinguishing "this should've been semantic search" from "this is a legitimate exact-match lookup" is fuzzy enough that a wrong hard-block is more disruptive than a wrong nudge. Trades a guaranteed redirect for the risk of ignored nudges (see Lapse #2 below, which happened even with the grep hard block in place, via an allowlisted single-file fallback) — worth re-auditing after a few more sessions to see if compliance holds without the block.
- Escalation path (Ollama → Haiku/Sonnet on a wrong/incomplete answer) still has no tooling support — self-judgment only.

## Quick answers to the standing questions

- **Do users need to run commands for specific scenarios?** Only for the initial one-time project setup (`/init-project` already run) and if the vector index somehow needs a manual rebuild outside a commit (`pnpm run index`). Day-to-day search, indexing-after-commit, and codebase-grep redirection are all automatic.
- **What's automatic vs. not, in one line:** daemon-level behavior (Ollama load/unload, post-commit indexing) is automatic; everything else — including grep/semantic-search choice as of 2026-08-03 — requires me to *recognize a task type and choose a tool* and is a convention, not an enforcement. This is exactly where lapses happen; nudges lower the odds but don't guarantee compliance.
