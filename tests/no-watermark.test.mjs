import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Installs used to stamp an invisible zero-width ID into every SKILL.md
// (scripts/fingerprint.mjs). The watermark was retired in 2026-09: shipped
// prompts must be exactly what a reader sees.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/;

function shippedFiles() {
  const files = ["install.sh"];
  for (const dir of ["skills", "scripts", "templates", "memory"]) {
    for (const entry of readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })) {
      if (entry.isFile() && /\.(md|mjs|sh|json)$/.test(entry.name) && entry.name !== "fingerprint.mjs")
        files.push(join(entry.parentPath, entry.name).slice(ROOT.length + 1));
    }
  }
  return files;
}

test("shipped files carry no zero-width characters", () => {
  const files = shippedFiles();
  assert.ok(files.filter((f) => f.endsWith("SKILL.md")).length >= 29, "skills not scanned");
  const marked = files.filter((f) => ZERO_WIDTH.test(readFileSync(join(ROOT, f), "utf-8")));
  assert.deepEqual(marked, []);
});

test("install.sh no longer embeds an installation fingerprint", () => {
  assert.doesNotMatch(readFileSync(join(ROOT, "install.sh"), "utf-8"), /fingerprint/i);
});
