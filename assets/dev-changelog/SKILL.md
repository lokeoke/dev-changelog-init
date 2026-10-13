---
name: dev-changelog
description: "Post-commit workflow to create or update per-issue changelog files after a commit has already been created. Use when user says post-commit changelog, update changelog after commit, implementation notes after commit, PR context, problems resolved, skip changelog, or no changelog."
argument-hint: "[post-commit changelog | update changelog after commit | skip changelog]"
---

# Dev Changelog

Create implementation-memory changelog files under `<CHANGELOG_DIR>` only
after a commit has already been created. These files preserve goal, problems,
and resolutions for the current PR/branch so future work avoids repeating the
same mistakes.

Set `<CHANGELOG_DIR>` to the repo's changelog directory (for example
`docs/changelog`). If it is not configured, stop and ask the user for the path.

## When To Use

Use this workflow only after a commit exists, when the user asks for a
post-commit changelog or implementation notes after commit, a
commit-creation flow just completed and now needs changelog follow-up, or
the user asks for PR implementation notes, changelog context, or
problems/resolutions.

This is the single source of truth for run/skip, create/update, and
multi-match decisions. Decide what to do, in this order, stopping at the
first match:

1. No commit exists yet → do not run.
2. This is a commit-message-only step → do not run.
3. User said "skip changelog" / "no changelog" / "commit only" → do not run.
4. Change is trivial → do not run. Trivial includes: formatting-only,
   typo-only, lockfile-only, generated-only, pure metadata noise (changes
   only to `.gitignore`, editor config, badge URLs, or non-functional
   comments), refactors with no behavior change, and test-only additions.
   Dependency version bumps that affect runtime behavior are not trivial.
5. The completed commit is meaningful: it changes behavior, public API, or
   data schema, or fixes a bug (and did not match step 4) → continue below.
6. No changelog file exists yet for this issue → ask before creating (see
   Workflow step 4).
7. Multiple changelog files match this issue → follow Workflow step 3.
8. Exactly one changelog file matches this issue → update it automatically
   (see Workflow step 5).

The target commit is HEAD by default. If the user specifies a different single
commit, use that commit as `<COMMIT>` instead of HEAD for every git command in
this workflow, including the `date` and `paths` frontmatter. If the user
specifies a commit range, ask the user to name one commit before continuing.

## Workflow

1. Inspect the completed commit.
   - `git show --stat --oneline <COMMIT>` and `git show --name-only <COMMIT>`
     as source of truth (`<COMMIT>` is HEAD unless the user specified one).
     `git show <COMMIT>` when implementation detail is needed.
   - Ignore unrelated working-tree changes unless asked to include them.
   - If `<COMMIT>` does not resolve or these git commands fail (no commits,
     not a repo), stop and report that no commit exists to document rather
     than proceeding.
   - If `<COMMIT>` is a merge commit, use `git show --stat -m <COMMIT>` or diff
     against the merge base to determine changed files.

2. Detect issue or PR identity.
   - Prefer active PR data when available: number, title, body, base/head
     branch (`gh pr view --json number,title,body,headRefName,baseRefName`
     when `gh` is available and a PR exists for this branch).
   - If `gh` is unavailable or the command errors, treat it the same as no
     PR data and fall back to `git branch --show-current`.
   - Otherwise use `git branch --show-current`.
   - If `git branch --show-current` returns empty (detached HEAD) and no PR
     data is available, skip straight to the fallback identity below and
     note that no branch/PR identity was resolvable.
   - Extract the issue id, trying in order, first match wins:
     1. A tracker key in the PR title or branch name (e.g. `PROJ-123`) —
        Jira/Linear-style trackers.
     2. For GitHub Issues: a closing keyword in the PR body (`Fixes #42`,
        `Closes #42`, `Resolves #42`), else a bare `#42` in the PR title,
        else a number that directly follows `issue-` or `gh-`, or that is the
        leading token of the branch name (e.g. `42-short-name`, `issue-42`,
        `gh-42`). Ignore other numbers (versions like `v2`, dates, `2fa`).
   - If no id is found anywhere, use `MISC` as the issue id. Do not invent
     other fallback names.

3. Find a matching changelog file.
   - Check changelog files changed on the branch with
     `git diff --name-only <BASE>...HEAD -- <CHANGELOG_DIR>`, where `<BASE>`
     is the PR base branch (`baseRefName`) or the default branch when no PR
     data exists.
   - Check staged/unstaged changelog files: `git status --short <CHANGELOG_DIR>`.
   - Match `{issue}-*.md`.
   - If multiple matches exist: use the single one already changed in the
     working tree; if none or more than one is changed in the working tree,
     ask which one to update. Once a single file is selected (or only one
     match exists), do not ask again.
   - If `<CHANGELOG_DIR>` does not exist, create the directory when creating
     the first changelog file.

4. Create the first changelog only after confirmation.
   - Ask: `No changelog found for {issue}. Create one for this commit?`
     (the file is saved unstaged unless the user also asks to stage, amend,
     or create a follow-up docs commit).
   - If no user response is possible (non-interactive run), do not create a
     changelog. Report it as skipped pending user confirmation.
   - If yes, create `<CHANGELOG_DIR>/{issue}-{number}-{short-summary}.md`.
   - `{number}`: scan existing files matching `{issue}-NNN-*.md`; take the
     highest `NNN` for this issue, add one, and zero-pad to 3 digits. Use
     `001` when no file for this issue exists yet.
   - `{short-summary}` is a 2-5 word, lowercase, kebab-case slug.
   - If the user declines, do not create a changelog for this commit and
     report it as skipped by user choice. Do not re-prompt for subsequent
     commits on the same branch unless the user re-requests a changelog.
     This decline applies for the remainder of the current branch's
     lifetime; if the branch is later merged and reused, or a new session
     begins, treat it as a fresh decision.

5. Update an existing changelog without prompting.
   - Refine the existing sections instead of appending date-stamped mini-logs.
   - Add only durable context from the completed commit.
   - If new work invalidates old wording, edit the old wording so the file
     stays true — don't just append a correction below it.

6. Preserve the template shape and fill the frontmatter.
   - Use `dev-changelog-template.md` (bundled alongside this file) for new files.
     If this template file is missing, stop and report that the template
     file could not be found rather than fabricating a structure.
   - Keep the frontmatter block and these three sections exactly:
     - `## Goal of these changes`
     - `## Problems during implementation`
     - `## Resolution of problems`
   - Fill frontmatter every time a file is created or updated:
     - `issue` — the issue/PR id from step 2. Set once on create.
     - `date` — on create, set to the current commit's date
       (`git show -s --format=%cs <COMMIT>`). Set once on create; the
       `git log --follow --diff-filter=A --format=%cs -- <file>` form is only
       for reconstructing `date` on an already-committed changelog file that
       lacks it.
     - `paths` — files changed by this commit (`git show --name-only <COMMIT>`;
       for merge commits use `git show --name-only -m <COMMIT>`),
       unioned with whatever paths are already listed, excluding
       `<CHANGELOG_DIR>` itself, deduped and sorted. `paths: []` is valid when
       the change has no direct file diff — do not force a path onto it.
     - `tags` — pick from the vocabulary already in use (run
       `<SEARCH_SCRIPT> --tags` (set this to the repo's tag-listing script,
       e.g. `scripts/search-changelogs.sh --tags`) to list existing
       tags); reuse an existing tag over inventing a near-duplicate. If no
       entries exist yet, choose a small set of new lowercase kebab-case tags
       describing the change. If the script is missing or fails, report that
       tag reuse could not be verified and pick tags conservatively.
   - On update, never change `date` or `issue` — those are frozen at create
     time, even though `paths` and `tags` keep growing.

7. Write useful content.
   - Goal: why this change exists, not a file-by-file diff.
   - Problems: blockers, failed assumptions, hidden constraints, test
     failures, API/schema traps, edge cases worth remembering.
   - Resolution: what fixed each problem, and any validation command that
     proved it.
   - If no problem is worth preserving, write `- None worth preserving.` Do
     not invent problems.
   - Prefer concise bullets over prose for problems and resolutions.

8. Integrate with the commit flow.
   - Commit creation always comes first; this workflow follows only after a
     successful commit.
   - If only writing a commit message, do not run this workflow.
   - After writing or editing frontmatter, run the repo's index rebuild command
     (set `<REBUILD_INDEX_COMMAND>` to e.g. `npm run changelog:index`) so the index never drifts from the file it was just generated from. If that
     command is absent or fails, report that the index may be stale and that
     manual regeneration is needed, instead of silently proceeding.
   - If `INDEX.md` is gitignored, the rebuild only refreshes a local browsing
     copy; search never reads it. If it is committed, leave it unstaged like
     any other post-commit change (see below).
   - Post-commit changelog changes remain unstaged unless explicitly asked to
     stage, amend, or create a follow-up docs commit.
   - Never stage unrelated files.

## Output Expectations

When done, report:

- Changelog file created or updated.
- Whether it still needs staging.
- Any skipped reason, if no changelog update was made.
