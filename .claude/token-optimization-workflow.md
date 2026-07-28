# Token Optimization Workflow — How It Actually Works

_Last audited: 2026-07-27, during a live session. Updated same day after building four new hooks to close the gaps found below._

This documents what's **enforced by tooling** (hooks/hard-blocks) vs. what's a
**convention I (the assistant) must self-apply** (no technical enforcement) —
plus the lapses observed this session and where to invest next.

## What runs automatically — no user command needed

| Mechanism | Trigger | Enforcement |
|---|---|---|
| Grep-block → semantic search redirect | Any `Bash` call matching `grep -r`/`rg`/`find -name *.ts` etc. | **Hard block** (`PreToolUse` hook, `~/.claude/hooks/nudge-direct-grep.sh` → `detect-codebase-grep.py`). Exit code 2, command never runs. Pipeline grep (`git log \| grep`) and single-file grep are allowlisted through. |
| Vector index refresh | Every `git commit` | **Hard automatic** — `.git/hooks/post-commit` runs `bun tools/vector-index.ts` unconditionally. No manual `pnpm run index` needed after a commit. |
| Large full-file read nudge | Any `Read` with no `limit`/`offset` on a file >400 lines | **Soft nudge only** (`nudge-large-read.sh`) — shows a suggestion to delegate to search/Explore, does not block. |
| Large-output command nudge | `bun/pnpm/npm build`, `tsc`, `test`, `install` without a pipe to `head`/`tail`/`grep` | **Soft nudge only** (`nudge-large-output.sh`) — suggests piping through `tail -80` etc., does not block. |
| Ollama model loading | First `ollama_chat`/`ollama_generate`/`/api/embed` call to a given model name | Automatic **at the Ollama daemon level** — lazy-loads on first request, unloads after ~5 min idle. Not related to Claude Code hooks at all. |
| Global tool allowlist for Ollama | N/A | `~/.claude/settings.json` pre-allows `ollama_generate/chat/list/ps` — no permission prompt interrupts the routing decision once I choose to call it. |
| Ollama Q&A routing nudge | Any `UserPromptSubmit` matching explain/summarize/decode/AC-extraction/commit-msg-draft phrasing, without file/code refs | **Soft nudge, new 2026-07-27** — `~/.claude/hooks/nudge-ollama-qa.sh` injects a reminder into context to route to `ollama_chat`/`qwen3.5:9b` before I respond. Doesn't block; I can still choose to answer directly if the task turns out to need project context. |
| Lookup-delegation nudge | Any `UserPromptSubmit` matching "where is X" / "does Y exist" / "find the Z" style phrasing, without implementation verbs | **Soft nudge, new 2026-07-27** — `~/.claude/hooks/nudge-lookup-delegation.sh` suggests `vector-search.ts` (if the project has one) or the search/Explore agent. |
| Ollama-routing compliance tally | End of every assistant turn (`Stop`) | **Soft self-report, new 2026-07-27** — `~/.claude/hooks/nudge-ollama-tally.sh` + `ollama-tally.py` rescan the transcript for flagged-but-unrouted prompts and print only newly found lapses (state tracked per-session in `~/.claude/hooks/.state/`), so repeat nagging doesn't happen. |
| Post-commit index-rebuild failure signal | `.git/hooks/post-commit` non-zero exit from `bun tools/vector-index.ts` | **Hard automatic, new 2026-07-27** — now checks the exit code and fires a macOS notification + stderr line if the rebuild fails, instead of failing silently. |

## What requires an explicit decision (not enforced by any hard block)

| Convention | Where documented | Enforcement |
|---|---|---|
| Route self-contained Q&A (explain error, summarize snippet, AC extraction, commit msg draft) → `ollama_chat` `qwen3.5:9b` | `~/.claude/CLAUDE.md` routing table | **Soft nudge as of 2026-07-27** (see table above) + self-report tally. This is the one that lapsed this session before the hooks existed. |
| Route grep/find/"where is X" → `search` agent (Haiku) or `vector-search.ts` | Same table / project `CLAUDE.md` | **Soft nudge as of 2026-07-27** (lookup-delegation hook) — still not a hard block; I can act on or ignore the injected context. |
| Escalate ambiguous/failed lookups from Ollama → Haiku/Sonnet | Global CLAUDE.md | **None.** Self-judgment only — no hook covers this yet. |

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

- No hard block exists for model routing or lookup delegation the way grep has one — by design, since "should this be a self-contained Q&A" is fuzzier to detect reliably than grep syntax and a wrong hard-block would be more disruptive than a wrong nudge.
- Escalation path (Ollama → Haiku/Sonnet on a wrong/incomplete answer) still has no tooling support — self-judgment only.

## Quick answers to the standing questions

- **Do users need to run commands for specific scenarios?** Only for the initial one-time project setup (`/init-project` already run) and if the vector index somehow needs a manual rebuild outside a commit (`pnpm run index`). Day-to-day search, indexing-after-commit, and codebase-grep redirection are all automatic.
- **What's automatic vs. not, in one line:** hard technical blocks (grep redirect) and daemon-level behavior (Ollama load/unload, post-commit indexing) are automatic; anything requiring me to *recognize a task type and choose a tool* (Ollama routing, agent delegation, semantic-search-first) is a convention, not an enforcement — and is exactly where lapses happen.
