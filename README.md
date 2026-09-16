# dev-changelog-init

Agent skill that sets up a searchable, per-issue changelog: bootstraps a
convention from scratch, adds an index to one that already exists, or
verifies a partial setup.

## Why

Per-issue changelog files get hard to use as they grow: no metadata to
filter by, no generated index, no discovery pointer. This skill fixes all
three — tracker-, language-, and task-runner-agnostic.

## What it sets up

- Frontmatter: `issue`, `date`, `paths`, `tags`
- Generated, deterministic `INDEX.md`
- Rebuild/search scripts adapted to the repo's toolchain
- A post-commit changelog-writing skill (or an update to the existing one)
- Discovery/trigger pointers in existing agent docs

## Install

```text
.agents/skills/dev-changelog-init/
  SKILL.md
  assets/
```

Also works under `.github/skills/` or `.claude/skills/`. `assets/` is
required — it holds the generic changelog-writing skill, entry template,
and reference scripts.

## Use

Ask an agent to add, index, or search a changelog, or retrofit an existing
changelog-tracking process. Optionally give a changelog directory, or
`skip backfill`.

Four phases, confirmed before any file changes: **Detect → Ask → Plan &
confirm → Execute & verify**.

## Compatibility

Entries must be Markdown with `---`-delimited frontmatter and `#` headings.
Any tracker, or none, works. The `.mjs` reference scripts need adapting
(`// ADAPT:` markers) — not drop-in.

## Included assets

| Path | Purpose |
| --- | --- |
| `SKILL.md` | Interactive setup and verification workflow. |
| `assets/dev-changelog/SKILL.md` | Post-commit entry creation/update workflow. |
| `assets/dev-changelog/dev-changelog-template.md` | Entry template with frontmatter. |
| `assets/rebuild-dev-changelog-index.reference.mjs` | Deterministic index generator reference. |
| `assets/search-dev-changelog.reference.mjs` | Index-only path/tag/title search reference. |

## License

MIT.
