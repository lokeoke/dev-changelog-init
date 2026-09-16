# Phase 0 detection — what to dig for

Read this before starting Phase 0. No assume anything from reference build
carry over.

- **The changelog convention itself, if any.** Find skill/process that write
  per-issue changelog files (grep `.claude/skills/`, `.agents/skills/`,
  `.github/prompts/`, or ask user). If found, read its filename pattern
  (issue-id format, sequence numbering — e.g. `PROJ-18-003-slug.md` for a
  Jira/Linear-style key, `42-003-slug.md` for a bare GitHub Issue number, or
  `YYYY-MM-DD-slug.md` when there is no tracker), its required section
  headings, and whether any frontmatter already there. No tracker is
  privileged — GitHub Issues, Jira, Linear, or none at all are all valid
  starting points; adapt to whatever this repo actually uses.
- **Any overlapping skill or tool.** Widen the same grep beyond "changelog"
  naming — a prior journal, dev-log, or memory-keeping skill/tool may cover
  the same job under its own name and directory. Do not assume what it is
  called or where it lives. This is a genuinely separate tool, never the same
  convention just classified above under a different name — a partially-wired
  changelog system that happens not to say "changelog" anywhere is a Partial
  finding above, not an overlapping tool here; the two classifications are
  mutually exclusive for the same file(s). If detection finds a candidate
  distinct from whatever was classified above, note its name and path here as
  evidence only; Phase 1 asks the user to confirm or supply both before
  deciding whether to replace it.
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
  line-based logic. If line-based parsing cannot reliably handle the required
  fields and the user declines the new dependency, stop and report that the
  skill cannot be safely implemented without a YAML parser, and ask the user
  how to proceed.
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
  CI? If yes, read `references/lint-notes.md` before writing the rebuild/search
  scripts — reference scripts in `assets/` already written to pass common
  findings this hit in original build; keep those patterns when adapt them.
