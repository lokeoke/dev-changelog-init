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
7. A changelog file already exists for this issue → update it automatically
   (see Workflow step 5).
8. Multiple changelog files match this issue → prefer the one already
   changed in the working tree; otherwise ask which one to update (see
  Workflow step 3). If more than one matching file was changed in the
  working tree, ask which one to update. Do not ask again once a matching
  file exists.

If the user specifies a different commit or commit range, use that commit
instead of HEAD for all `git show` commands in this workflow.

## Workflow

1. Inspect the completed commit.
   - `git show --stat --oneline HEAD` and `git show --name-only HEAD` as
     source of truth. `git show HEAD` when implementation detail is needed.
   - Ignore unrelated working-tree changes unless asked to include them.
   - If HEAD does not resolve or these git commands fail (no commits, not a
     repo), stop and report that no commit exists to document rather than
     proceeding.
   - If HEAD is a merge commit, use `git show --stat -m HEAD` or diff
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
        else a leading/embedded number in the branch name (`42-short-name`,
        `issue-42`, `gh-42`).
   - If no id is found anywhere, use a fallback identity (e.g. `MISC`, or
     whatever no-issue convention this repo already uses).

3. Find a matching changelog file.
   - Check files changed on the branch under `<CHANGELOG_DIR>`.
   - Check staged/unstaged changelog files: `git status --short <CHANGELOG_DIR>`.
   - Match `{issue}-*.md`.
   - If multiple matches exist, prefer one already changed in the working
     tree; otherwise ask which one to update. If more than one matching file
     was changed in the working tree, ask which one to update.
   - If `<CHANGELOG_DIR>` does not exist, create the directory when creating
     the first changelog file.

4. Create the first changelog only after confirmation.
   - Ask: `No changelog found for {issue}. Add one to this commit?`
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
       (`git show -s --format=%cs HEAD`). Set once on create; the
       `git log --follow --diff-filter=A --format=%cs -- <file>` form is only
       for reconstructing `date` on an already-committed changelog file that
       lacks it.
     - `paths` — files changed by this commit (`git show --name-only HEAD`),
       unioned with whatever paths are already listed, excluding
       `<CHANGELOG_DIR>` itself, deduped and sorted. `paths: []` is valid when
       the change has no direct file diff — do not force a path onto it.
     - `tags` — pick from the vocabulary already listed in `<CHANGELOG_DIR>`'s
       `INDEX.md` preamble; reuse an existing tag over inventing a
       near-duplicate. If `INDEX.md` does not exist yet, create it (or run
       the rebuild script to generate it) and choose a small set of new
       lowercase kebab-case tags describing the change.
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
   - After writing or editing frontmatter, run the rebuild script (see the
     command named in `<CHANGELOG_DIR>/INDEX.md`'s header) so the index never
     drifts from the file it was just generated from. If that command is
     absent or fails, report that the index may be stale and that manual
     regeneration is needed, instead of silently proceeding.
   - If `INDEX.md` was just created in this same run and has no rebuild
     command yet, skip the rebuild step and note that `INDEX.md` needs a
     rebuild command added.
   - Post-commit changelog changes remain unstaged unless explicitly asked to
     stage, amend, or create a follow-up docs commit.
   - Never stage unrelated files.

## Output Expectations

When done, report:

- Changelog file created or updated.
- Whether it still needs staging.
- Any skipped reason, if no changelog update was made.
