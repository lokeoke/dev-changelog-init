#!/usr/bin/env node
// REFERENCE IMPLEMENTATION — adapt before dropping into a target repo.
// Validated, lint-clean (incl. SonarQube) on a Node/npm/ESM repo. Adapt the
// ADAPT-marked lines; if the target repo isn't Node, reimplement using this
// as a spec — same CLI contract, same exit-code conventions.
//
// Searches changelog entries for a path, tag, or title. Builds the rows in
// memory from entry frontmatter (via the rebuild script's collectRows()), so it
// works the same whether INDEX.md is committed, gitignored, stale, or absent.

import { collectRows } from "./rebuild-dev-changelog-index.mjs"; // ADAPT: this script's real filename

function rowText(row) {
  return [row.date, row.issue, row.title, row.file, row.tags.join(", "), row.paths.join(", ")]
    .join(" ")
    .toLowerCase();
}

function main() {
  const args = process.argv.slice(2);
  const rows = collectRows();

  if (args[0] === "--tags") {
    const tags = new Set(rows.flatMap((r) => r.tags));
    console.log([...tags].sort((a, b) => a.localeCompare(b)).join("\n")); // never a bare .sort()
    return;
  }

  const query = args.join(" ").trim();
  if (!query) {
    console.error("search:dev-changelog: usage: <run> -- <path-or-tag>");
    console.error("                   <run> -- --tags");
    process.exit(1); // usage error — the only case that exits non-zero
  }

  const needle = query.toLowerCase();
  const matches = rows.filter((row) => rowText(row).includes(needle));

  if (matches.length === 0) {
    // Not a failure — a clean miss is a legitimate answer. Exit 0.
    console.log(`No changelog entries match "${query}".`);
    return;
  }

  for (const row of matches) {
    console.log(`${row.date} ${row.issue} — [${row.title}](./${row.file}) [${row.tags.join(", ")}]`);
    console.log(`  ${row.paths.map((p) => `\`${p}\``).join(", ")}`);
  }
}

main();
