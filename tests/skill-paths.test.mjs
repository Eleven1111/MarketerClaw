import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function skillDocs() {
  const docs = [];
  for (const skill of readdirSync(join(ROOT, "skills"))) {
    const path = join(ROOT, "skills", skill, "SKILL.md");
    if (existsSync(path)) docs.push({ skill, text: readFileSync(path, "utf-8") });
  }
  return docs;
}

// Installed layout is <base>/skills/<skill>/ next to <base>/scripts/, so a
// path relative to the skill dir or to the user's cwd never finds the scripts.
test("skills call scripts through $SCRIPTS_DIR, not skill- or cwd-relative paths", () => {
  for (const { skill, text } of skillDocs()) {
    assert.doesNotMatch(text, /\{SKILL_DIR\}\/\.\.\/scripts/, `${skill}: {SKILL_DIR}/../scripts`);
    assert.doesNotMatch(text, /node\s+scripts\//, `${skill}: node scripts/… (cwd-relative)`);
  }
});

test("every script referenced via $SCRIPTS_DIR exists in scripts/", () => {
  const refs = [];
  for (const { skill, text } of skillDocs()) {
    for (const m of text.matchAll(/\$SCRIPTS_DIR\/([\w.-]+\.mjs)/g)) refs.push({ skill, file: m[1] });
  }
  assert.ok(refs.length >= 4, `expected script references, found ${refs.length}`);
  for (const { skill, file } of refs) {
    assert.ok(existsSync(join(ROOT, "scripts", file)), `${skill} references missing scripts/${file}`);
  }
});
