# dev-changelog-init

VS Code agent skill for setting up a searchable, per-issue development
changelog. It either bootstraps a convention, adds indexing to an existing one,
or verifies a partially configured system.

## Why

Per-issue changelog files become hard to use as they grow:

- no metadata means past work cannot be filtered quickly;
- no generated index means agents must scan every entry; and
- no discovery pointer means a useful index is easily missed.

This skill addresses all three without assuming a tracker, language, task
runner, or repository layout.

## What it sets up

- Markdown frontmatter: `issue`, `date`, `paths`, and `tags`
- Generated, deterministic `INDEX.md`
- Rebuild and search scripts adapted to the target repository toolchain
- A post-commit changelog-writing skill or an update to the existing process
- Narrow discovery/trigger pointers in existing agent documentation

`date` remains the entry creation date. `paths` and `tags` are extended over
later updates, keeping history searchable without rewriting its chronology.

## Install

Keep the directory intact in a supported skill location:

```text
.agents/skills/dev-changelog-init/
  SKILL.md
  assets/
```

Other supported locations include `.github/skills/dev-changelog-init/` and
`.claude/skills/dev-changelog-init/`. The assets are required: they provide the
generic changelog-writing skill, entry template, and Node/ESM reference scripts.

## Use

Ask an agent to add a changelog, index an existing changelog, make changelogs
searchable, or retrofit a `repo-changelog`-style process. Optionally provide:

- a likely changelog directory; or
- `skip backfill` to select tooling-only lazy backfill when an existing
  convention is detected.

The skill deliberately uses four phases:

1. **Detect** — inspect existing conventions, tooling, documentation, and Git
   history without changing files.
2. **Ask** — collect only details detection cannot establish.
3. **Plan and confirm** — show exact edits and require explicit approval.
4. **Execute and verify** — implement only approved changes, then test index
   regeneration, search behavior, integration, and repository quality gates.

No files change before the explicit Phase 2 confirmation.

## Compatibility

The target changelog must use Markdown entries capable of `---`-delimited
frontmatter and `#` headings. GitHub Issues, Jira, Linear, custom IDs, and no
tracker are supported. Non-Markdown changelogs require a separate migration
decision.

The included `.mjs` files are reference implementations, not universal drop-in
scripts. Adapt every line marked `// ADAPT:` to the target repository, including
paths, YAML parsing, title format, and task-runner command names.

## Included assets

| Path | Purpose |
| --- | --- |
| `SKILL.md` | Interactive setup and verification workflow. |
| `assets/dev-changelog/SKILL.md` | Post-commit entry creation/update workflow. |
| `assets/dev-changelog/changelog-template.md` | Entry template with frontmatter. |
| `assets/rebuild-changelog-index.reference.mjs` | Deterministic index generator reference. |
| `assets/search-changelog.reference.mjs` | Index-only path/tag/title search reference. |

## License

Released under the **MIT License**.
