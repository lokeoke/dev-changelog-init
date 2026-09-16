# Lint/static-analysis notes

From original build, hit by SonarQube quality gate — keep these patterns if
target repo run similar analysis. Applies to the rebuild/search scripts
written or adapted in Phase 3.3.

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
