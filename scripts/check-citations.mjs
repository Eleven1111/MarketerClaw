#!/usr/bin/env node
/**
 * check-citations.mjs — Citation discipline lint (warning-only)
 *
 * Scans markdown output for lines that carry hard data points (percentages,
 * currency amounts, 万/亿 magnitudes, sales/market-size figures) without a
 * source marker: [n] citation, [推断...], or ⚠️ assumption flag.
 *
 * Used by finalize.mjs (warnings → stderr, never blocks delivery).
 * CLI: node scripts/check-citations.mjs <file.md>
 */

import { readFileSync } from "fs";

// A line "carries data" if it contains one of these patterns
const DATA_PATTERNS = [
  /\d+(?:\.\d+)?\s*%/, // percentages
  /[¥$€£]\s*\d/, // currency amounts
  /\d+(?:\.\d+)?\s*(?:万|亿)/, // CN magnitudes
  /(?:月销|销量|市场规模|增速|CAGR|GMV|客单价|转化率)[^|\n]{0,12}\d/, // metric + number
];

// A line is "covered" if it carries any source/assumption marker
const COVERED_PATTERNS = [
  /\[\d+\]/, // [1] citation
  /\[推断/, // [推断，基于...]
  /⚠️?/, // assumption flag
  /估算|假设|示例|举例/, // self-declared estimate / example
];

// Lines to skip entirely
const SKIP_PATTERNS = [
  /^\s*(?:```|~~~)/, // fence markers (state handled below too)
  /^\s*\|[\s:-]+\|/, // table separator rows
  /[{}]|XX|N\b/, // template placeholders
  /^\s*>/, // quoted examples
  /\d{4}-\d{2}-\d{2}/, // bare dates
];

export function checkCitations(content) {
  const warnings = [];
  let inFence = false;

  content.split("\n").forEach((line, idx) => {
    if (/^\s*(?:```|~~~)/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    if (SKIP_PATTERNS.some((p) => p.test(line))) return;
    if (!DATA_PATTERNS.some((p) => p.test(line))) return;
    if (COVERED_PATTERNS.some((p) => p.test(line))) return;

    warnings.push({ line: idx + 1, text: line.trim().slice(0, 80) });
  });

  return warnings;
}

export function formatWarnings(warnings, label = "") {
  if (warnings.length === 0) return "";
  const head = `[citations] ⚠ ${label}${warnings.length} 处具体数字缺少来源标注（[n] / [推断] / ⚠️）：\n`;
  const lines = warnings
    .slice(0, 10)
    .map((w) => `  L${w.line}: ${w.text}`)
    .join("\n");
  const more = warnings.length > 10 ? `\n  ... 及另外 ${warnings.length - 10} 处` : "";
  return head + lines + more + "\n";
}

// ── CLI ───────────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) {
    process.stderr.write("Usage: check-citations.mjs <file.md>\n");
    process.exit(1);
  }
  const warnings = checkCitations(readFileSync(file, "utf-8"));
  process.stderr.write(formatWarnings(warnings, `${file}: `) || `[citations] ✓ ${file}\n`);
  process.exit(0);
}
