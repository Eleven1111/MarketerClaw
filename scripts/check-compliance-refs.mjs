#!/usr/bin/env node
/**
 * check-compliance-refs.mjs — Structure + freshness check for mc-review's
 * jurisdiction rule tables (skills/mc-review/references/*.md).
 *
 * Laws change; a rule table with no date and no source silently rots (the EU
 * file cited a Green Claims Directive that never became law while missing the
 * ECGT Directive that applies from 2026-09-27). Every reference file must:
 *   - declare `last_verified: YYYY-MM-DD` near the top
 *   - cite at least one source [n] in every table row
 *   - define every cited [n] under "## 来源" with an http(s) URL,
 *     and cite every source it defines
 *   - be listed in mc-review's SKILL.md load table (no orphan rule files)
 * With --freshness it also fails when last_verified is older than
 * MAX_AGE_DAYS — CI runs that weekly so stale rules surface on their own.
 *
 * CLI: node scripts/check-compliance-refs.mjs [--freshness] [--today YYYY-MM-DD]
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname, resolve, basename } from "path";
import { fileURLToPath } from "url";

export const MAX_AGE_DAYS = 180;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REF_DIR = join(ROOT, "skills", "mc-review", "references");
const SKILL_MD = join(ROOT, "skills", "mc-review", "SKILL.md");

const DAY_MS = 86_400_000;

function parseDate(s) {
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Check one reference file. Returns { errors: string[], lastVerified, ageDays }.
 * `today` (YYYY-MM-DD) is only used when `freshness` is true.
 */
export function checkReference(text, { freshness = false, today, maxAgeDays = MAX_AGE_DAYS } = {}) {
  const errors = [];
  const lines = text.split("\n");

  const dateMatch = lines.slice(0, 10).join("\n").match(/last_verified:\s*(\d{4}-\d{2}-\d{2})/);
  const lastVerified = dateMatch ? parseDate(dateMatch[1]) : null;
  if (!lastVerified) errors.push("missing `last_verified: YYYY-MM-DD` in the first 10 lines");

  const sourcesAt = lines.findIndex((l) => /^##\s*来源\s*$/.test(l.trim()));
  if (sourcesAt < 0) errors.push('missing "## 来源" section');
  const body = sourcesAt < 0 ? lines : lines.slice(0, sourcesAt);
  const sourceLines = sourcesAt < 0 ? [] : lines.slice(sourcesAt + 1);

  // Table data rows: lines starting with "|" that are neither the header
  // (followed by a separator) nor the separator itself.
  const cited = new Set();
  body.forEach((line, i) => {
    if (!line.trim().startsWith("|")) return;
    if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) return; // separator
    if (body[i + 1] && /^\s*\|[\s:|-]+\|\s*$/.test(body[i + 1])) return; // header
    const refs = [...line.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
    if (refs.length === 0) {
      errors.push(`table row without a [n] source: ${line.trim().slice(0, 60)}`);
    }
    refs.forEach((n) => cited.add(n));
  });
  // Citations outside tables count too.
  body.forEach((line) => {
    for (const m of line.matchAll(/\[(\d+)\]/g)) cited.add(Number(m[1]));
  });

  const defined = new Map();
  for (const line of sourceLines) {
    const m = line.match(/^\s*\[(\d+)\]\s+(.+)$/);
    if (!m) continue;
    const n = Number(m[1]);
    if (!/https?:\/\/\S+/.test(m[2])) errors.push(`source [${n}] has no http(s) URL`);
    defined.set(n, m[2]);
  }
  for (const n of cited) {
    if (!defined.has(n)) errors.push(`[${n}] is cited but not defined under 来源`);
  }
  for (const n of defined.keys()) {
    if (!cited.has(n)) errors.push(`source [${n}] is defined but never cited`);
  }

  let ageDays = null;
  if (lastVerified && freshness) {
    const now = parseDate(today ?? new Date().toISOString().slice(0, 10));
    ageDays = Math.floor((now - lastVerified) / DAY_MS);
    // One day of slack: CI runs on UTC while the date is written in local time.
    if (ageDays < -1) {
      errors.push(`last_verified is in the future (${-ageDays} days ahead) — typo?`);
    }
    ageDays = Math.max(ageDays, 0);
    if (ageDays > maxAgeDays) {
      errors.push(`last_verified is ${ageDays} days old (max ${maxAgeDays}) — re-verify the rules`);
    }
  }

  return { errors, lastVerified, ageDays };
}

/** Reference files mc-review's SKILL.md does not mention (never loaded). */
export function unlistedReferences(skillText, files) {
  return files.filter((f) => !skillText.includes(`references/${f}`));
}

export function referenceFiles() {
  return readdirSync(REF_DIR).filter((f) => f.endsWith(".md")).sort();
}

// ── CLI ───────────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const freshness = args.includes("--freshness");
  const todayIdx = args.indexOf("--today");
  const today = todayIdx >= 0 ? args[todayIdx + 1] : undefined;

  const files = referenceFiles();
  let failed = false;
  for (const f of files) {
    const { errors, ageDays } = checkReference(readFileSync(join(REF_DIR, f), "utf-8"), { freshness, today });
    if (errors.length) {
      failed = true;
      process.stderr.write(`✖ ${f}\n${errors.map((e) => `    ${e}`).join("\n")}\n`);
    } else {
      process.stdout.write(`✓ ${f}${ageDays !== null ? ` (verified ${ageDays} days ago)` : ""}\n`);
    }
  }
  const unlisted = unlistedReferences(readFileSync(SKILL_MD, "utf-8"), files);
  if (unlisted.length) {
    failed = true;
    process.stderr.write(`✖ not in mc-review load table: ${unlisted.map((f) => basename(f)).join(", ")}\n`);
  }
  process.exit(failed ? 1 : 0);
}
