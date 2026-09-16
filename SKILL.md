---
name: dev-changelog-init
description: "Sets up a searchable, filterable changelog system in a repo — bootstraps a per-issue changelog-writing convention from scratch if none exists, retrofits an index onto one that already exists, or verifies/extends a partial prior setup. Adds issue/date/paths/tags frontmatter, a generated INDEX.md, index/search scripts, and triggers so agents check prior history before implementing. Interactive: detects repo state first, asks scenario-specific questions, shows one consolidated plan for confirmation before touching any files. Use when asked to add a changelog, add a changelog index, make a changelog searchable, or extend/retrofit a repo-changelog-style skill with search."
argument-hint: "[path to changelog dir | skip backfill]"
---
# Changelog Index

Turn pile of per-issue changelog files — or total absence of one — into thing
agent can ask before work, not thing it only find by grep git history for
current branch. Fully self-contained: all it need (include generic template for
changelog-writing skill it can bootstrap from nothing) ship in `assets/`. Never
assume target repo match one shape; Phase 0 exist because it will vary.

**Two thing this design fix, why both matter:**

1. **No filter** — no metadata, no index. "What past work touch this area" have
   no answer but read every file.
2. **No trigger** — nothing make agent check old history before work in area, so
   even perfect index sit unused.

Fix only #1 and agents still never look. Fix only #2 (e.g. one blanket "always
check the changelog" line in top-level instructions file) and you rebuild exact
failure this design dodge: broad instructions fight everything else in context,
no follow reliable. Both piece needed.

## When NOT to use this

Changelog directory (exist or planned) would hold only handful of entries, no
growth. Index earn cost only when volume big enough that read-everything not
fastest. If unsure, ask user, no assume; this can also pop mid-flow as Scenario A
early-out (see Phase 1).

## This skill is interactive, and detects before it asks

Unlike normal interactive scaffold prompt (which often jump straight to "gather
requirements"), this skill detect repo real state FIRST (Phase 0), because which
questions even make sense depend on that state. Then ask only what detection
no resolve (Phase 1), show one merged plan and get explicit yes before touch
anything (Phase 2 — hard gate, no formality, since this skill can write as many
files as bootstrap whole new convention need), run (Phase 3), then check
(Phase 4).

## Phase 0 — Detect (read-only, no questions yet)

If invoked with an argument, treat it as a hint, not a replacement for
detection: a filesystem path pre-fills the changelog-directory guess Phase 0
still verify; the literal `skip backfill` pre-answers Scenario B's backfill
question as "tooling only, lazy backfill" so Phase 1 skip asking it. Any other
argument shape, or no argument, changes nothing below. If the supplied path
does not exist or is not a directory, do not treat it as authoritative: report
that the path was not found, fall back to full detection, and confirm the
resolved changelog directory with the user in Phase 1.

If detection finds more than one changelog convention or changelog directory
(e.g. a monorepo with per-package changelogs), stop and ask the user in Phase 1
which one to target, or whether to set up per-package indexes; do not silently
pick one.

No assume anything from reference build carry over. Dig:

- **The changelog convention itself, if any.** Find skill/process that write
  per-issue changelog files (grep `.claude/skills/`, `.agents/skills/`,
  `.github/prompts/`, or ask user). If found, read its filename pattern
  (issue-id format, sequence numbering — e.g. `PROJ-18-003-slug.md` for a
  Jira/Linear-style key, `42-003-slug.md` for a bare GitHub Issue number, or
  `YYYY-MM-DD-slug.md` when there is no tracker), its required section
  headings, and whether any frontmatter already there. No tracker is
  privileged — GitHub Issues, Jira, Linear, or none at all are all valid
  starting points; adapt to whatever this repo actually uses.
- **The changelog file format**, if convention exist. Confirm entries are
  Markdown (or other format that support `---`-delimited frontmatter block and
  `# ` heading) before assume Phases 1-3 apply as written — non-Markdown format
  (plain text, JSON, database of entries) need whole different frontmatter
  mechanism. If the changelog format is non-Markdown, do not proceed with
  Phases 1-3 as written. Stop, report that this skill supports only
  frontmatter-capable Markdown entries, and ask the user whether to convert
  entries to Markdown or abort.
- **The scripting toolchain.** Package manager if JS/Node repo
  (npm/pnpm/yarn/bun/none), or equivalent for whatever language repo really use
  (pip/poetry, cargo, go.mod, bundler, etc.) — no default to Node. Module system
  (ESM `.mjs`, CJS, TypeScript, or non-JS language whole), existing `scripts/`
  conventions (arg-parsing style, error/exit conventions, task-naming pattern),
  and whether YAML parser dependency already there (reuse it; no add new
  dependency if equivalent already there — check `yaml`, `js-yaml`, or language
  stdlib). If no YAML parser exists and none can be reused, surface this in
  Phase 2 as a required new dependency and get explicit confirmation before
  adding it, or fall back to parsing only the fixed known fields with simple
  line-based logic.
- **The trigger mechanism.** This is fact to settle here, not preference to ask
  later. Does repo have path-scoped agent-instructions system (e.g.
  `.github/instructions/*.instructions.md` with `applyTo`/`paths` frontmatter,
  `.cursor/rules/`, `.clinerules/`, Windsurf rules) or only single always-loaded
  file (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`)? If path-scoped system exist,
  also settle *which specific files* would carry pointer (narrow-scoped files
  whose area cluster changelog history, skip wildcard/near-wildcard ones — see
  Phase 3.5b). Only push this to Phase 1 question if truly unclear: competing
  systems found at once, or no dominant candidate among several path-scoped
  options.
- **Top-level agent-instruction files and their relationships.** List every
  always-loaded file present (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`,
  Copilot-specific conventions file like `copilot-instructions.md`, etc.) and
  spot import/inclusion directives between them — e.g. Claude Code `@path`
  import syntax inside `CLAUDE.md` pull in `AGENTS.md` and/or Copilot
  conventions file, or documented prose delegation ("detailed rules live in X,
  don't duplicate here"). This map is what stop duplicate of same line into file
  whose content already flow into another by import — Phase 3.5a edit file that
  own content, not every file that happen to load it.
- **Static analysis.** Is SonarQube, strict ESLint config, or similar wired into
  CI? If yes, reference scripts in `assets/` already written to pass common
  findings this hit in original build (see "Lint/static-analysis notes" under
  Phase 3.3) — keep those patterns when adapt them.

### Classify the scenario

- **Scenario A** — no changelog-writing convention at all.
- **Scenario B** — convention exist, but no index/frontmatter (original,
  narrower version of this skill handle only this case).
- **Scenario C** — convention exist AND already have index/frontmatter.
- **Partial** — some but not all Phase 3 sub-steps already look done (e.g.
  frontmatter added but no `INDEX.md`, or scripts there but never wired into
  task runner, or trigger line added but no frontmatter). No smash this into
  binary A/B/C guess — list exactly which sub-steps exist and which missing;
  Phase 1 will ask about this direct.

Detection markers for C/Partial: generated-index file carrying "generated by X,
do not hand-edit" preamble (not just any file with table — that dodge
false-positive on hand-written doc that happen to hold one); sample of entries
whose frontmatter already have `issue`/`date`/`paths`/`tags`; existing
rebuild/search scripts or equivalent task-runner entries; changelog-writing
skill own instructions already mention frontmatter population or rebuild call.
Track one more gap on its own: whether changelog-writing skill — exist or about
to be authored — already mentioned anywhere in top-level files mapped above.
Repo can have fully wired index and still never mention skill exist anywhere
human would read first; that still gap, even when everything else Scenario C.
This apply in all scenarios, not just A/Partial.

Fill this state block during Phase 0: scenario label (A/B/C/Partial), the
Phase 3 checklist table below with Done/Missing per row, the trigger-mechanism
resolution, and the top-level-file import map. Echo this whole state block
verbatim at the start of Phase 1, Phase 2, and Phase 3 before doing anything
else in that phase; do not proceed with a phase until it is restated. Do not
re-derive scenario logic from memory — copy the block forward instead. Mark each row Done
or Missing, and add exact detected file/path evidence beside it.

| Phase 3 sub-step | Done/Missing | Evidence / missing action |
| --- | --- | --- |
| 3.1 Frontmatter on entries |  |  |
| 3.2 Generated `INDEX.md` |  |  |
| 3.3 Rebuild/search scripts and task wiring |  |  |
| 3.4 Changelog-writing skill/template integration |  |  |
| 3.5a Top-level announcement of skill |  |  |
| 3.5b Trigger pointer for index lookup |  |  |

### Scenario A only — infer the filename/issue convention before asking

Grep `AGENTS.md`/`README.md`/`CONTRIBUTING.md`/`CLAUDE.md` for documented branch
or issue-naming convention — e.g. branch-naming section that say
`PROJ-<n>-<slug>` for a Jira/Linear-style key, or `<n>-<slug>`/`issue-<n>` for a
bare GitHub Issue number, with `misc/` or `chore/` prefix as no-issue fallback —
then cross-check against `git branch -a` / recent `git log` subjects for
matching pattern. Show whatever found as settled default in Phase 1, no ask
cold. If nothing found, Phase 1 ask date-based vs. free-text-prefix from blank
slate instead.

Everything below assume answers to this phase; adapt file paths, language, and
field names to match what really found, not what written here.

## Phase 1 — Ask (via `AskUserQuestion`, branches on the Phase 0 classification)

**Scenario A** — four questions, this order:

1. **Name + directory** — default `dev-changelog` / `docs/changelog/`; confirm
   or override.
2. **Filename convention** — show Phase 0 inferred default (issue-id format +
   sequence numbering) to confirm/override; if nothing inferred, ask
   issue-id-based vs. date-based vs. free-text-prefix from scratch. Issue-id
   form works the same whether that id comes from Jira, Linear, GitHub Issues,
   or any other tracker — it just a string this repo already use to name work.
3. **Template sections + heading shape** — default to three validated sections
   (`## Goal of these changes` / `## Problems during implementation` /
   `## Resolution of problems`) plus `# {ISSUE}-{NUMBER} {Title}` H1 (matches
   bundled `assets/dev-changelog/changelog-template.md` — first token before
   the space is the id, no internal space, whether that id is issue-id-only or
   issue-id-plus-sequence-number). **This answer is hard dependency for Phase
   3.3**: rebuild script title parser assume H1 first token (up to first
   space) is the id and rest is title — if this answer change that shape,
   Phase 3.3 must adapt parser too, not just template.
4. **Trigger philosophy** — default to "ask once whether to create first entry
   for given issue, then update it automatic on every meaningful commit after,
   no ask again" (bundled template Core Rule — see
   `assets/dev-changelog/SKILL.md`); confirm or override.

If Phase 0 finds no existing skill mechanism location, ask where the
changelog-writing skill should live before bootstrapping; do not guess a
location.

No backfill question in this branch — zero old entries, nothing to backfill.

**Scenario B** — backfill-options question (same as original design, now asked
out loud not assumed):

1. **Full backfill now** — all existing entries get frontmatter and index fill
   fully right away.
2. **Tooling only, lazy backfill** — ship mechanism; old entries stay
   frontmatter-less until they happen to get touched again (rebuild script
   skip-with-warning behavior make this safe, not broken).
3. **Tooling now, backfill as a separate follow-up change.**

This is real scope decision — it can be bulk of total diff. Always ask; never
assume. Plus, *only if Phase 0 flag trigger mechanism as unclear*, ask which
path-scoped file(s) or top-level file should carry it.

**Scenario C / Partial** — show Phase 0 detected-state report (what exist, what
missing) from the Phase 3 checklist and ask which path:

1. **Verify only** (recommended default) — run rebuild + search once, confirm
   output stable/consistent, report any drift, make **zero** file edits.
2. **Extend the gap** — run only specific missing sub-steps Phase 0 already
   listed; nothing else touched.
3. **Rebuild from scratch** — explicit opt-in only; treat as full Scenario B
   retrofit, replace what there.

## Phase 2 — Plan & Confirm

Merge everything settled in Phases 0-1 — frontmatter schema, index format,
settled script/task-runner naming, settled trigger-mechanism file list, Scenario
A four answers or Scenario B backfill choice or Scenario C chosen path — into
one concrete, scannable plan. Include the Phase 3 checklist table with final
Done/Missing state and planned action for every Missing row. Show it. Get
explicit yes before Phase 3 touch anything. This gate apply same in all
scenarios; not optional for any.

Give skill-announcement edit (Phase 3.5a) its own named line in this plan — no
fold it into trigger-mechanism line. Say exactly which file(s) get touched and
one-line content for each (e.g. "`AGENTS.md`: add line noting `dev-changelog`
writes post-commit entries to `docs/changelog/`, indexed and searchable — see
`docs/changelog/INDEX.md`"). If Phase 0 file map found that edit one file
already spread into another by import (e.g. edit `AGENTS.md` where `CLAUDE.md`
only import it), say so here, so user not surprised later that only one file
changed. This is real, visible, shared-convention edit — it get confirmed out
loud, no assume.

## Phase 3 — Execute

### 3.1 Frontmatter schema

```yaml
---
issue: <issue-id>
date: <YYYY-MM-DD>
paths:
  - <path/one>
tags:
  - <tag-one>
---
```

- `issue` — whatever issue/PR id filename already encode (or, in Scenario A,
  whatever Phase 1 settle on). Tracker-agnostic: a Jira/Linear-style key, a
  bare GitHub Issue number, or any other id shape this repo uses — the field
  name stays `issue` regardless of which tracker issued it.
- `date` — day-granularity, set once at creation from commit that first add file
  (`git log --follow --diff-filter=A --format=%cs -- <file>` or equivalent).
  Never touched by later in-place updates — it stable sort key, not "last
  touched" timestamp. If changelog-writing skill refine entry in place across
  many commits, keep this frozen on purpose.
- `paths` — files touched, unioned across every commit that ever
  create/update entry (not just creation commit — refinements happen), deduped
  and sorted, exclude changelog directory itself. This is field that really
  answer "what touched this area." Some entries (e.g. ones about cross-repo
  migration, or decision with no direct diff) will rightly have empty
  `paths: []` — that correct, no bug; no force path onto entry that have none.
- `tags` — **semi-controlled vocabulary specific to target repo**, never
  free-form and never rigid enforced enum. Free-form shatter into near-duplicates
  (`db-migration` vs `migration` vs `schema-change`); hard enum need validation
  machinery not worth it for few dozen to few hundred entries. In Scenario B/C,
  pull starter vocabulary from that repo own existing entries — skim
  titles/topics, cluster them. Produce between 15 and 25 tags inclusive: if
  fewer than 15 natural clusters exist, keep only those; if more than 25,
  merge least-frequent near-duplicates down to exactly 25. In Scenario A, seed small
  starter vocabulary from Phase 1 answers (repo area, stack) since no existing
  corpus to mine yet, and expect it to grow. No reuse vocabulary list from
  different repo. Write vocabulary as preamble line in generated index (single
  source, no separate taxonomy file), and prefer reuse existing tag over invent
  near-duplicate.
- Anything relational/narrative ("this entry supersedes that one") stay as prose
  in body — it no filter axis, no force it into frontmatter.

### 3.2 Generated index (the load-bearing invariant)

Index file is **generated, never hand-maintained**. This is one design decision
to keep no matter what else change per-repo: instead of changelog-writing skill
try to keep append-on-create/edit-on-update line in sync by hand (two places
that will drift), it only ever touch file frontmatter, then script rebuild whole
index deterministic from every file frontmatter. Drift become structurally
impossible as long as rebuild step run — and idempotent, so run it twice in row
with no changes make byte-identical output.

Format: one row per entry (table or list, whatever fit repo docs style), full
paths shown — no truncate. Search script read only index, never source files, so
truncated path become unsearchable. Sort by date descending is fine default;
adapt if repo own changelog ordering convention differ. In Scenario A, this
start as valid, empty-but-well-formed index (header + tag-vocabulary preamble +
empty table body) — both reference scripts already handle zero entries right.

### 3.3 Two scripts

Same contract whatever implementation language:

1. **Rebuild** — read every changelog entry frontmatter, skip (with warning, no
   hard fail) any file missing required fields — this is what make
   lazy/incremental backfill safe — and rewrite index file from scratch every
   run.
2. **Search** — read only generated index (never source files), match query
   against path/tag/title text (case-insensitive substring enough at scale this
   built for; no add glob-matching machinery unless substring really prove not
   enough), and `--tags` mode that list vocabulary now in use. Exit non-zero only
   on real usage error (missing index, no query) — "no matches" is legit answer,
   no failure, and should exit 0.

Reference implementations in `assets/` (`rebuild-changelog-index.reference.mjs`,
`search-changelog.reference.mjs`) are working, lint-clean Node/ESM code from
original build — copy and adapt paths/field names if target repo Node-based;
else treat them as spec to rebuild in repo own language. Every line that need
adapting is marked `// ADAPT: ...`. Two things to check out loud, no just skim
past:

- Generated `INDEX.md` text in `rebuild-changelog-index.reference.mjs` name
  task-runner command **three separate times** in that string block; adapt all
  three, not just first, or generated doc will forever tell readers to run
  command that no exist in this repo.
- `parseTitle()` heading-shape assumption (`# {ISSUE}-{NUMBER} {Title}`,
  first space-delimited token stripped as id) is exactly Phase 1 Scenario A
  question 3 H1 answer. In Scenario B/C this already validated against
  existing template; in Scenario A you choose it fresh — if it anything other
  than "first token is id, rest is title," rewrite this function logic, no
  leave mismatch in place.

Wire scripts into whatever task runner repo really use (`package.json` scripts,
`Makefile`, `justfile`), follow that repo own existing naming convention for
tasks — no invent new naming scheme. If repo have none of three, plain
documented shell command (e.g. `node scripts/rebuild-changelog-index.mjs`) is
fine fallback — no invent task-runner config just for this.

**Lint/static-analysis notes** (from original build, hit by SonarQube quality
gate — keep these patterns if target repo run similar analysis):

- Every `.sort()` call need explicit compare function, even for plain string
  arrays (`(a, b) => a.localeCompare(b)`) — bare `.sort()` get flagged whatever
  element type.
- Dodge two adjacent variable-length regex quantifiers over overlapping
  character classes (e.g. `\s+` right before `.+`) — flagged as super-linear
  backtracking risk even when real input always small. Prefer plain string ops
  (`split`, `startsWith`, `indexOf`, `slice`) over regex for anything like "find
  heading line, split off first token" — simpler, faster, no flagged.
- No nested ternaries — pull out to `localeCompare`/an if-chain/named function
  instead of `a ? b : c ? d : e`.
- Prefer optional chaining (`frontmatter?.issue`) over `!frontmatter ||
  !frontmatter.issue`.
- After rebuild script run, run repo own formatter (Prettier or equivalent)
  before call output final — formatter may reflow generated table rows (e.g.
  column alignment), which fine, but if your own hand-written source strings
  break long inline-code span across line wrap, fix that in generator, no let
  formatter paper over it.

### 3.4 Changelog-writing skill

**Scenario B / Extend / Rebuild-from-scratch**: whatever skill/process now
create these files need to, on every create-or-update:

1. Fill/extend frontmatter (issue from what it already parse; date from commit;
   paths unioned from `git show --name-only`, exclude changelog directory; tags
   from vocabulary, prefer reuse).
2. Never change `date` or `issue` once set, on later in-place updates.
3. Run rebuild script so index never go stale.

Edit that skill own instructions file and template direct — no build parallel
mechanism next to it.

**Scenario A**: no existing skill to edit — bootstrap one from bundled generic
template at `assets/dev-changelog/` (`SKILL.md` + `changelog-template.md`),
copy into target repo own skill location (wherever Phase 0 found repo skill
mechanism live — e.g. `.claude/skills/<name>/`, `.agents/skills/<name>/`, or
equivalent) and rename/fill with Phase 1 Scenario A answers: name, directory,
filename convention, template shape, trigger philosophy. Bundled template already
have right shape — Core Rule (ask once for first entry per issue, update
automatic no ask again after), numbered workflow (inspect finished commit →
detect issue/PR identity across whatever tracker this repo use → find or
create matching file → fill frontmatter and body → run rebuild script) — so
this step is adaptation (fill placeholders, rename `<CHANGELOG_DIR>`/`{ISSUE}`
conventions to what Phase 1 settle on), no invention from blank page.

### 3.5 Announce the skill and wire the trigger mechanism

Run what Phase 2 already confirmed — no re-ask here. Two parts; when both land
on same file, write them as **one combined edit**, never two separate diffs to
same doc.

#### 3.5a — Announce the changelog-writing skill

Apply in **every scenario, always** — unless Phase 0 already found it announced.
Using file map from Phase 0, add short, factual line to file(s) that really
**own** content (not files that merely import it) — name, what it do, where it
write, and that it post-commit. Same discoverability framing as 3.5b below: state
fact, no behavioral mandate ("must run before every commit"). This new ground
even for Scenario B/C, where skill already existed before this tool run — check
whether it ever mentioned in top-level docs at all, and add pointer if not,
whatever else changed.

#### 3.5b — Trigger mechanism for the index

- **Path-scoped instructions system**: add entries only for areas that (a)
  are among the top 3 directory areas by number of changelog entries whose
  `paths` fall under that area, (b) each have at least 5 entries, and (c) are
  not already covered by existing narrow-scoped rule file. Append short "check
  the index before implementing" pointer to existing narrow-scoped rule files
  too — but skip any file whose scope already wildcard/near-wildcard
  (`applyTo: "**"` or similar). Fire on nearly every edit kill point of
  path-scoping and bring back "one blanket instruction" problem from opening
  section.
- **Only always-loaded top-level files exist** (`CLAUDE.md`, `AGENTS.md`,
  `.cursorrules`, single `README.md`): add **one line**, framed as
  discoverability note ("the changelog is indexed at X, searchable with Y"), no
  behavioral mandate ("always check before implementing"). Mandate form is
  failure mode; discoverability form close "does this tool even exist" gap
  without fight for attention on every edit.

### 3.6 Backfill execution (Scenario B, if chosen)

Mechanical part only — ask already happened in Phase 1. `issue`/`date`/`paths`
fully derivable from git history (script it, no hand-transcribe). `tags` need
content skim per entry against repo-specific vocabulary — for more than handful
of entries, this is one place in whole skill that truly parallelize: batch
entries and classify batches at once (if environment have multi-agent
orchestration tool, use it here specific — this step, no rest of skill, is
fan-out-shaped part) instead of read all entries one by one. Keep tag vocabulary
closed during this pass (agents pick from list, they no invent tags) so parallel
batches can no shatter into near-duplicate tags.

### 3.7 Scenario C / Partial paths

- **Verify only**: run rebuild + search once, confirm output stable/consistent,
  report drift if any. No file edits.
- **Extend the gap**: run only listed missing sub-steps from Phase 0 Partial
  report — nothing else touched.
- **Rebuild from scratch**: run full 3.1-3.6 path as if Scenario B.

## Phase 4 — Verify

1. Make one throwaway test entry, run rebuild script, confirm it show in index
   right, delete it, rebuild again, confirm it vanish clean (prove regeneration,
   no accumulation). Skip this if Scenario C Verify-only path chosen — that path
   make no edits by design.
2. Separately, exercise **changelog-writing skill itself** end to end — make one
   small real (or throwaway-branch) commit and let that skill create or update
   entry normal way (whether it one just authored in Scenario A or one just
   edited in Scenario B/Extend) — to confirm it really fill frontmatter and fire
   rebuild automatic. Test only rebuild script direct no prove skill integration
  work; both need check. If the skill does not fill frontmatter or fire the
  rebuild during this test, do not report success — identify the missing
  wiring, fix it, and re-run the end-to-end test before completing.
3. Search by known path and known tag from real entry; confirm nonsense query
   give clean "no matches" and exit 0.
4. Run repo own lint/format/test gate. If backfilling, confirm index entry count
   match changelog directory file count.
5. If repo run static analysis in CI, confirm new scripts pass it — no wait for
   CI round-trip to find out; check local if there way to (equivalent linter, or
   read specific rules that commonly fire, see notes in Phase 3.3).

Report what skipped or assumed, same as any other change — no let
`## Not resolved`-style caveat go unsaid just because skill made it.
