---
name: dev-changelog-init
description: "Sets up a searchable, filterable changelog system in a repo — bootstraps a per-issue changelog-writing convention from scratch if none exists, retrofits an index onto one that already exists, or verifies/extends a partial prior setup. Adds issue/date/paths/tags frontmatter, a generated INDEX.md, index/search scripts, and triggers so agents check prior history before implementing. Interactive: detects repo state first, asks scenario-specific questions, shows one consolidated plan for confirmation before touching any files. Use when asked to add a changelog, add a changelog index, make a changelog searchable, or extend/retrofit an existing changelog-tracking skill with search."
argument-hint: "[path to changelog dir | skip backfill]"
---
# Changelog Index

Turn pile of per-issue changelog files — or total absence of one — into thing
agent can ask before work, not thing it only find by grep git history for
current branch. Fully self-contained: all it need ship in its own directory —
generic template for changelog-writing skill (it can bootstrap from nothing) and
reference scripts in `assets/`, detection and lint guidance in `references/`. Never
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

No assume anything from reference build carry over. Dig into seven areas: the
changelog convention itself (if any), any overlapping skill/tool, the entry
file format, the scripting toolchain, the trigger mechanism, top-level
agent-instruction file relationships, and static analysis tooling. Read
`references/detection.md` (bundled in this skill's own directory) now,
before proceeding — it has the exact grep targets and edge-case handling
(multi-convention repos, non-Markdown format, missing YAML parser, competing
trigger systems, overlap vs. Partial classification) for each area; skipping
it risks missing a genuinely separate overlapping tool or a non-Markdown
format that changes everything downstream. If a file under `references/` or
`assets/` that this skill tells you to read cannot be read, stop before
Phase 1, report the missing file path, and do not proceed with detection
from memory.

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
rebuild/search scripts or equivalent task-runner entries (a missing
`INDEX.md` alone is not a gap if `.gitignore` lists it — fresh clones of an
ignored-index repo never have one); changelog-writing
skill own instructions already mention frontmatter population or rebuild call.
Track one more gap on its own: whether changelog-writing skill — exist or about
to be authored — already mentioned anywhere in top-level files mapped above.
Repo can have fully wired index and still never mention skill exist anywhere
human would read first; that still gap, even when everything else Scenario C.
This apply in all scenarios, not just A/Partial.

Fill this state block once during Phase 0: scenario label (A/B/C/Partial), the
Phase 3 checklist table below with Done/Missing per row, the trigger-mechanism
resolution, and the top-level-file import map. Treat this filled table as the
single source of record — at the start of Phase 1, Phase 2, and Phase 3,
reference it by pointer ("per the Phase 0 checklist above") instead of
retyping it verbatim; do not proceed with a phase until you have re-read it.
The one exception is the Phase 2 plan, which must show the table in full
(see Phase 2) because the user approves from that output alone.
Do not re-derive scenario logic from memory — look up the table instead. Mark
each row Done or Missing, and add exact detected file/path evidence beside it.

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

Use this table as the quick-reference map of which base questions apply; the
detailed prose below each scenario gives the exact wording and defaults.

| Scenario | Base questions to ask |
| --- | --- |
| A | Name+directory default (silent, confirmed at Phase 2 plan gate — see below), Q1 Filename convention, Q2 Template sections+heading shape, Q3 Trigger philosophy (+ skill location if unknown), Q4 Commit `INDEX.md`?, Q5 Starter tags |
| B | Backfill-option question (3 choices); add trigger-mechanism file question only if Phase 0 flagged it unclear |
| C / Partial | Path-choice question (Verify only / Extend the gap / Rebuild from scratch) |

**Overlap decision table** — the single source for overlap handling. Phases 1,
2, and 3.4 refer to it by row number; do not restate its conditions elsewhere.
Applies only if Phase 0 flagged an overlapping skill or tool. In every row,
first ask the overlap confirm-name/directory question, then the
Replace-or-Leave question; the last two columns say what follows from the
answer.

| # | Scenario | If user answers Replace — questions to ask | If user answers Leave — questions to ask |
| --- | --- | --- | --- |
| O1 | A | None — reuse the Q1-Q5 answers already gathered | None — treat overlap as the existing convention and edit it in place per Phase 3.4 |
| O2 | B | Ask filename convention, template sections+heading shape, trigger philosophy (scoped to this replacement only) | None — edit in place per Phase 3.4 |
| O3 | C / Partial | Same three questions as O2 | None — edit in place per Phase 3.4 |

**Scenario A** — name + directory settle silent first (below), then five
questions, this order:

**Name + directory** — default `dev-changelog` / `docs/changelog/`, no ask.
State default in Phase 2 plan for confirm/override there, same gate every
other answer pass through. Escalate to explicit question here, before Phase
2, only if Phase 0 detect real conflict: name/directory already used by
something else, or repo have strong existing naming convention default would
break (e.g. every skill in repo prefixed `internal-`). If Phase 0 found no
existing skill mechanism location at all, ask where changelog-writing skill
should live before bootstrapping — that a location question, not naming
preference, and cannot default.

1. **Filename convention** — show Phase 0 inferred default (issue-id format +
   sequence numbering) to confirm/override; if nothing inferred, ask
   issue-id-based vs. date-based vs. free-text-prefix from scratch. Issue-id
   form works the same whether that id comes from Jira, Linear, GitHub Issues,
   or any other tracker — it just a string this repo already use to name work.
   If the user chooses date-based or free-text-prefix, there is no issue id in
   the filename: set `issue` to the full filename stem without the date or
   sequence suffix (or the date string if no other id exists), and state the
   chosen `issue` derivation in the Phase 2 plan.
2. **Template sections + heading shape** — default to three validated sections
   (`## Goal of these changes` / `## Problems during implementation` /
   `## Resolution of problems`) plus `# {ISSUE}-{NUMBER} {Title}` H1 (matches
   bundled `assets/dev-changelog/dev-changelog-template.md` — first token before
   the space is the id, no internal space, whether that id is issue-id-only or
   issue-id-plus-sequence-number). **This answer is hard dependency for Phase
   3.3**: rebuild script title parser assume H1 first token (up to first
   space) is the id and rest is title — if this answer change that shape,
   Phase 3.3 must adapt parser too, not just template.
3. **Trigger philosophy** — default to "ask once whether to create first entry
   for given issue, then update it automatic on every meaningful commit after,
   no ask again" (bundled template Core Rule — see
   `assets/dev-changelog/SKILL.md`); confirm or override.
4. **Commit `INDEX.md`?** — default **no**: gitignore it, and let the search
   script build rows in memory. Committed index is a merge-conflict magnet —
   every PR adds an entry and regenerates the same file, so parallel PRs
   collide on it constantly. Offer **yes, commit it** only if something needs
   it in git (browse on GitHub web, agents with no Node). If yes, also add
   `<CHANGELOG_DIR>/INDEX.md merge=union` to `.gitattributes` (keeps both sides
   on local merges; rebuild after any merge) and keep the generated text free
   of volatile lines (see 3.2).
5. **Starter tags** — list 5-10 tags for the main repo areas and stack (e.g.
   `api`, `db`, `frontend`), or confirm an empty starter list. Seeds the
   starter vocabulary in 3.1.

**Scenario A early-out** — if, at any point (including mid-flow), the user
confirms the changelog will stay small (see "When NOT to use this"), stop
without touching any files, report that no index was created, and exit.

No backfill question in this branch — zero old entries, nothing to backfill.

**Scenario B** — backfill-options question (same as original design, now asked
out loud not assumed):

1. **Full backfill now** — all existing entries get frontmatter and index fill
   fully right away.
2. **Tooling only, lazy backfill** — ship mechanism; old entries stay
   frontmatter-less until they happen to get touched again (rebuild script
   skip-with-warning behavior make this safe, not broken). Index row count
   will then be lower than file count by exactly the skipped files; Phase 4
   step 4 account for this.
3. **Tooling now, backfill as a separate follow-up change.**

This is real scope decision — it can be bulk of total diff. Always ask; never
assume — the one exception is the `skip backfill` argument (Phase 0), which
pre-answers this question as option 2, so do not ask it then. If `INDEX.md` is already committed, also ask Q4 above (commit or
ignore); to migrate, plan one line: `git rm --cached` the index, add it to
`.gitignore`. Never do this silently. Plus, *only if Phase 0 flag trigger mechanism as unclear*, ask which
path-scoped file(s) or top-level file should carry it.

**Scenario C / Partial** — show Phase 0 detected-state report (what exist, what
missing) from the Phase 3 checklist. If `INDEX.md` is committed, also offer
Q4 above as migration (never silent). Ask which path:

1. **Verify only** (recommended default) — run rebuild + search once, confirm
   output stable/consistent, report any drift, make **zero** file edits. The
   rebuild's regeneration of the index does not count as an edit when it leaves
   the file byte-identical; if it changes the file, report that as drift and
   restore the prior content instead of keeping the change.
2. **Extend the gap** — run only specific missing sub-steps Phase 0 already
   listed; nothing else touched.
3. **Rebuild from scratch** — explicit opt-in only; treat as full Scenario B
   retrofit, replace what there.

**Any scenario, only if Phase 0 flagged an overlapping skill or tool** — ask
the user to confirm or supply its exact directory and name, then whether to:

1. **Replace it** — its file(s) get overwritten with the bundled generic
   asset (`assets/dev-changelog/SKILL.md` + `dev-changelog-template.md`).
   Follow the matching row of the overlap decision table above for which
   questions to ask; name and directory are already settled by the question
   just above. Never invent answers from the bundled defaults.
2. **Leave it as-is** — edit it in place per Phase 3.4 (see the overlap
   decision table above).

Never guess this from a name match alone (e.g. do not assume a skill called
`journal` or `memory` is safe to replace); the user's answer here is the only
authorization to overwrite another skill's file.

## Phase 2 — Plan & Confirm

Merge everything settled in Phases 0-1 — frontmatter schema, index format,
settled script/task-runner naming, settled trigger-mechanism file list, the
`issue` derivation rule for non-issue-id filename conventions (Phase 1 Q1), committed-vs-ignored `INDEX.md` choice, Scenario
A name+directory default plus five answers, or Scenario B backfill choice, or
Scenario C chosen path — into one concrete, scannable plan. Include the Phase 3
checklist table with final Done/Missing state and planned action for every
Missing row. This is the one place the Phase 0 table is reproduced in full
(updated with final state), not referenced by pointer, since the user approves
from this output. Give the Phase 4 verification commit its own named line:
one small commit on the current branch or a throwaway branch, created only
after explicit approval; state which option will be used. Also give the Phase 4
step 1 test its own named line: "Verification test: create one throwaway entry in
`<CHANGELOG_DIR>`, rebuild, then delete it and rebuild again (no net file
change)." Show it. Get explicit yes before Phase 3 touch anything. This gate
apply same in all scenarios; not optional for any. If the user approves only
part of the plan, treat unapproved items as excluded from Phase 3 execution
and re-confirm the reduced plan before proceeding.

Scenario A's silently-defaulted name+directory get its one explicit confirm
chance right here — state it as own line (e.g. "Skill name: `dev-changelog`,
directory: `docs/changelog/`"), not folded silent into other lines, even
though no dedicated question raised it earlier.

Give skill-announcement edit (Phase 3.5a) its own named line in this plan — no
fold it into trigger-mechanism line. Say exactly which file(s) get touched and
one-line content for each (e.g. "`AGENTS.md`: add line noting `dev-changelog`
writes post-commit entries to `docs/changelog/`, indexed and searchable — see
`docs/changelog/INDEX.md`"). If Phase 0 file map found that edit one file
already spread into another by import (e.g. edit `AGENTS.md` where `CLAUDE.md`
only import it), say so here, so user not surprised later that only one file
changed. This is real, visible, shared-convention edit — it get confirmed out
loud, no assume.

If Phase 1 chose **Replace it** for an overlapping skill/tool (overlap
decision table, Phase 1), give that its own named line too: exact path(s) that get overwritten, and confirmation that
content comes from `assets/dev-changelog/` verbatim (adapted to settled
answers), not merged with what was there before. Overwriting another skill's
file is exactly the kind of edit that needs stated, out-loud confirmation —
never bundle it silently into another line.

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
  Set only when missing; never touched by later in-place updates — it stable
  sort key, not "last touched" timestamp. If changelog-writing skill refine entry in place across
  many commits, keep this frozen on purpose. If the repo has no git history
  for an entry file, or the git command fails (not a git repo, shallow clone),
  set `date` from the date in the filename or else the file's last-modified
  date, set `paths: []`, and report the fallback in the Phase 2 plan.
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
  titles/topics, cluster them. Target 15-25 tags. If natural clusters are
  fewer than 15, use as many as exist (do not invent tags to reach 15). If
  more than 25, merge least-frequent near-duplicates down to 25. In Scenario A, seed small
  starter vocabulary from Phase 1 answer Q5 (repo area, stack) since no existing
  corpus to mine yet, and expect it to grow. No reuse vocabulary list from
  different repo. Ordering: the search script does not exist until Phase 3.3, so
  in Scenario B/C build the starter vocabulary by manually skimming existing
  entry titles before Phase 3.3, and use the search script's `--tags` mode only
  after Phase 3.3 has run. Once the script exists, vocabulary is whatever tags
  entries already use — read it with the `--tags` mode (single source, no separate taxonomy file,
  and no shared "known tags" line in the index: two PRs adding different new
  tags would both edit it and conflict). Prefer reuse existing tag over invent
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

Committed or not (Q4), keep every line of generated output a function of one
entry's frontmatter plus a static header: no timestamp, no totals, no tag
counts, no shared vocabulary line — anything two parallel PRs would both edit
conflicts. If Q4 = ignored (default), add the index path to `.gitignore`; the
file is still generated locally for humans to browse.

Format: one row per entry (table or list, whatever fit repo docs style), full
paths shown — no truncate. Rows are never truncated, so every path stays searchable. Sort by date descending is fine default;
adapt if repo own changelog ordering convention differ. In Scenario A, this
start as valid, empty-but-well-formed index (header +
empty table body) — both reference scripts already handle zero entries right.

### 3.3 Two scripts

Same contract whatever implementation language:

1. **Rebuild** — read every changelog entry frontmatter, skip (with warning, no
   hard fail) any file missing required fields — this is what make
   lazy/incremental backfill safe — and rewrite index file from scratch every
   run. Treat `issue` as required only when Phase 1 Q1 selected an issue-id
   convention; otherwise require `date` and an `issue` derived per Q1.
2. **Search** — build rows in memory from entry frontmatter (reuse the rebuild
   script's row collection; never parse `INDEX.md`, which may be gitignored,
   stale, or absent), match query
   against path/tag/title text (case-insensitive substring enough at scale this
   built for; no add glob-matching machinery unless substring really prove not
   enough), and `--tags` mode that list vocabulary now in use. Exit non-zero only
   on real usage error (no query) — "no matches" is legit answer,
   no failure, and should exit 0.

Reference implementations in `assets/` (`rebuild-dev-changelog-index.reference.mjs`,
`search-dev-changelog.reference.mjs`) are working, lint-clean Node/ESM code from
original build — copy and adapt paths/field names if target repo Node-based;
else treat them as spec to rebuild in repo own language. Every line that need
adapting is marked `// ADAPT: ...`. Two things to check out loud, no just skim
past:

- Generated `INDEX.md` text in `rebuild-dev-changelog-index.reference.mjs` name
  task-runner command **three separate times** in that string block; adapt all
  three, not just first, or generated doc will forever tell readers to run
  command that no exist in this repo.
- `parseTitle()` heading-shape assumption (`# {ISSUE}-{NUMBER} {Title}`,
  first space-delimited token stripped as id) is exactly Phase 1 Scenario A
  question 2 H1 answer. In Scenario B/C this already validated against
  existing template; in Scenario A you choose it fresh — if it anything other
  than "first token is id, rest is title," rewrite this function logic, no
  leave mismatch in place.

Wire scripts into whatever task runner repo really use (`package.json` scripts,
`Makefile`, `justfile`), follow that repo own existing naming convention for
tasks — no invent new naming scheme. If repo have none of three, plain
documented shell command (e.g. `node scripts/rebuild-dev-changelog-index.mjs`) is
fine fallback — no invent task-runner config just for this.

**Lint/static-analysis notes** — if Phase 0 flagged CI static analysis
(SonarQube, strict ESLint, etc.), read `references/lint-notes.md` before
writing these scripts. It lists patterns the original build's quality gate
flagged (bare `.sort()`, nested ternaries, adjacent regex quantifiers, and
more) — keep them if target repo run similar analysis. If the file cannot be
read, stop, report its path, and do not write the scripts from memory.

### 3.4 Changelog-writing skill

**Scenario B / Extend / Rebuild-from-scratch**: whatever skill/process now
create these files need to, on every create-or-update:

1. Fill/extend frontmatter (issue from what it already parse; date from commit,
   set only when missing — see 3.1; paths unioned from `git show --name-only`, exclude changelog directory; tags
   from vocabulary, prefer reuse). If `git show --name-only` fails or git
   history is unavailable, set `paths: []` for that entry, leave any existing
   `paths` values unchanged, and report the fallback to the user.
2. Never change `date` or `issue` once set, on later in-place updates.
3. Run rebuild script so index never go stale.

Edit that skill own instructions file and template direct — no build parallel
mechanism next to it.

**Overlapping skill/tool marked Replace in Phase 1**: instead of editing its
existing logic in place, overwrite its file(s) — at the exact directory and
name confirmed in Phase 1 — with `assets/dev-changelog/SKILL.md` and
`dev-changelog-template.md`, adapted per the answers gathered under the
matching row of the Phase 1 overlap decision table. One
canonical source (`assets/`) replaces the old bespoke logic; do not keep both
or hand-merge the two. Also grep the repo's top-level docs for the replaced
tool's old name and update or remove any line that still describes its old
behavior, the same way 3.5a keeps top-level docs accurate for this skill.

**Scenario A**: no existing skill to edit — bootstrap one from bundled generic
template at `assets/dev-changelog/` (`SKILL.md` + `dev-changelog-template.md`),
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

Apply in **every scenario that edits files, always** — unless Phase 0 already
found it announced. The one exception is Scenario C **Verify only**, which makes
zero edits: if the announcement is missing there, report it as a gap and offer
the Extend path instead of editing.
Using file map from Phase 0, add short, factual line to file(s) that really
**own** content (not files that merely import it) — name, what it do, where it
write, and that it post-commit. Same discoverability framing as 3.5b below: state
fact, no behavioral mandate ("must run before every commit"). This new ground
even for Scenario B/C, where skill already existed before this tool run — check
whether it ever mentioned in top-level docs at all, and add pointer if not,
whatever else changed.

#### 3.5b — Trigger mechanism for the index

- **Path-scoped instructions system**: select areas, then add pointers, in
  this order:
  1. Count, repo-wide, the changelog entries per top-level directory (first
     path segment under the repo root) whose `paths` field includes a file
     under that directory.
  2. Keep only directories with at least 5 entries.
  3. Take the top 3 by count (never more than 3). Break ties at the 3rd-place
     cutoff by most recent entry `date`, then alphabetically by directory name.
  4. For each selected area, the pointer is a short discoverability line
     ("changelog for this area is indexed at X, searchable with Y") — same
     factual framing as the one-line top-level note defined in the next bullet
     ("the changelog is indexed at X, searchable with Y"), with no behavioral
     mandate wording like "always check before implementing".
     - If an existing narrow-scoped rule file already covers the area, do not
       create a new entry; append the pointer to that rule file — unless its
       scope is wildcard/near-wildcard (`applyTo: "**"` or similar), in which
       case skip it. Fire on nearly every edit kill point of path-scoping and
       bring back "one blanket instruction" problem from opening section.
     - If no existing narrow-scoped rule file covers the area, add a new
       path-scoped entry with the pointer.
- **Only always-loaded top-level files exist** (`CLAUDE.md`, `AGENTS.md`,
  `.cursorrules`, single `README.md`): add **one line**, framed as
  discoverability note ("the changelog is indexed at X, searchable with Y"), no
  behavioral mandate ("always check before implementing"). Mandate form is
  failure mode; discoverability form close "does this tool even exist" gap
  without fight for attention on every edit.

### 3.6 Backfill execution (Scenario B, if chosen)

Mechanical part only — ask already happened in Phase 1. `issue`/`date`/`paths`
fully derivable from git history (script it, no hand-transcribe). `tags` need
content skim per entry against repo-specific vocabulary — for more than 10
entries, this is one place in whole skill that truly parallelize: batch
entries and classify batches at once (if environment have multi-agent
orchestration tool, use it here specific — this step, no rest of skill, is
fan-out-shaped part) instead of read all entries one by one. Freeze tag
vocabulary for duration of this pass only — snapshot the starter list from 3.1
at pass start and ignore later `--tags` output until the pass ends (this
overrides the `--tags` rule in 3.1 for this pass): batch agents pick from the frozen list
and do not add tags themselves, so parallel batches can no shatter into
near-duplicate tags. If an entry fit no listed tag, agent leave it untagged and
report it back; orchestrator may add one new tag between batches (after check
for near-duplicate), then re-run for that entry. After pass, normal 3.1 rule
return: semi-controlled vocabulary, new tags allowed when no existing one fit.

### 3.7 Scenario C / Partial paths

- **Verify only**: run rebuild + search once, confirm output stable/consistent,
  report drift if any. No file edits (a byte-identical index regeneration is
  not an edit; if rebuild changes the index, report drift and restore it).
- **Extend the gap**: run only listed missing sub-steps from Phase 0 Partial
  report — nothing else touched.
- **Rebuild from scratch**: run full 3.1-3.6 path as if Scenario B.

## Phase 4 — Verify

1. Make one throwaway test entry, run rebuild script, confirm it show in index
   right, delete it, rebuild again, confirm it vanish clean (prove regeneration,
   no accumulation). Skip this step and step 2 if Scenario C Verify-only path
   chosen — that path make no edits by design. If the test entry does not appear correctly or
   does not vanish after rebuild, stop, diagnose the rebuild script logic, fix
   it, and re-run this verification before proceeding to step 2. If a fix to
   the rebuild script or skill wiring is needed, stop and get explicit user
   approval before editing.
2. Unless Verify-only, separately exercise **changelog-writing skill itself** end to end — make one
   small real (or throwaway-branch) commit — do not create it unless the
   Phase 2 plan included it — and let that skill create or update
   entry normal way (whether it one just authored in Scenario A, one just
   edited in Scenario B/Extend, or one just overwritten via Phase 1's
   overlap-Replace path) — to confirm it really fill frontmatter and fire
   rebuild automatic. Test only rebuild script direct no prove skill integration
  work; both need check. If the skill does not fill frontmatter or fire the
  rebuild during this test, do not report success — identify the missing
  wiring, fix it, and re-run the end-to-end test before completing.
3. Search by known path and known tag from real entry; confirm nonsense query
   give clean "no matches" and exit 0.
4. Run repo own lint/format/test gate. If Scenario A was chosen (no backfill),
   confirm the index contains zero rows and the changelog directory contains
   no entries (the test entry from step 1 was removed). If full backfill was chosen, confirm
   index entry count match changelog directory file count. If lazy or
   follow-up backfill was chosen, confirm instead that index entry count plus
   the number of files the rebuild script warned about and skipped equals the
   changelog directory file count. If the path is Scenario C Verify-only or
   Extend the gap and no backfill was chosen, confirm index entry count plus
   the number of files the rebuild script warned about and skipped equals the
   changelog directory file count. If the path is Scenario C Extend the gap and
   entries lack frontmatter, treat it as lazy backfill for count purposes.
5. If repo run static analysis in CI, confirm new scripts pass it — no wait for
   CI round-trip to find out; check local if there way to (equivalent linter, or
   read specific rules that commonly fire, see notes in Phase 3.3).

Report what skipped or assumed, same as any other change — no let
`## Not resolved`-style caveat go unsaid just because skill made it.
