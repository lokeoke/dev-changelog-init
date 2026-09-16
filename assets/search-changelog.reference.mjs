#!/usr/bin/env node
// REFERENCE IMPLEMENTATION — adapt before dropping into a target repo.
// Validated, lint-clean (incl. SonarQube) on a Node/npm/ESM repo. Adapt the
// ADAPT-marked lines; if the target repo isn't Node, reimplement using this
// as a spec — same CLI contract, same exit-code conventions.
//
// Searches <changelog-dir>/INDEX.md for entries matching a path or tag.
// Never reads the source changelog files — only the generated index.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), ".."); // ADAPT: path to repo root from this script's location
const INDEX_PATH = join(ROOT, "docs/changelog/INDEX.md"); // ADAPT: target repo's actual index path

function readDataRows() {
  const content = readFileSync(INDEX_PATH, "utf8");
  const lines = content.split("\n");
  const separatorIndex = lines.findIndex((l) => /^\|\s*---/.test(l));
  if (separatorIndex === -1) return [];
  return lines.slice(separatorIndex + 1).filter((l) => l.trim().startsWith("|"));
}

function columns(row) {
  return row
    .split("|")
    .map((c) => c.trim())
    .filter((_, i, arr) => i > 0 && i < arr.length - 1);
}

function main() {
  const args = process.argv.slice(2);

  if (!existsSync(INDEX_PATH)) {
    console.error("search:changelog: index not found."); // ADAPT: path in message
    console.error("Run the rebuild script first."); // ADAPT: actual command name
    process.exit(1); // usage/setup error — the only case that exits non-zero
  }

  if (args[0] === "--tags") {
    const rows = readDataRows();
    const tags = new Set();
    for (const row of rows) {
      const [, , , tagsCol] = columns(row); // ADAPT: column index if the index's column order differs
      for (const tag of tagsCol
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)) {
        tags.add(tag);
      }
    }
    console.log([...tags].sort((a, b) => a.localeCompare(b)).join("\n")); // never a bare .sort()
    return;
  }

  const query = args.join(" ").trim();
  if (!query) {
    console.error("search:changelog: usage: <run> -- <path-or-tag>");
    console.error("                   <run> -- --tags");
    process.exit(1);
  }

  const rows = readDataRows();
  const needle = query.toLowerCase();
  const matches = rows.filter((row) => row.toLowerCase().includes(needle));

  if (matches.length === 0) {
    // Not a failure — a clean miss is a legitimate answer. Exit 0.
    console.log(`No changelog entries match "${query}".`);
    return;
  }

  for (const row of matches) {
    const [date, issue, entry, tags, paths] = columns(row); // ADAPT: column order if the index schema differs
    console.log(`${date} ${issue} — ${entry} [${tags}]`);
    console.log(`  ${paths}`);
  }
}

main();
