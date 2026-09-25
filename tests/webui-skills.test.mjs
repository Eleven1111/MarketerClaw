import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// The WebUI's skill list is hand-written in types.ts and had drifted to 10 of
// 29 skills. This keeps it equal to the skills/ directory.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function webuiSkills(typesSource) {
  const start = typesSource.indexOf("export const SKILLS");
  if (start < 0) return [];
  const body = typesSource.slice(start, typesSource.indexOf("];", start));
  return [...body.matchAll(/\{ id: "([^"]+)", name: "([^"]*)", description: "([^"]*)"/g)].map(
    ([, id, name, description]) => ({ id, name, description }),
  );
}

const listed = webuiSkills(readFileSync(join(ROOT, "webui", "src", "lib", "types.ts"), "utf-8"));
const onDisk = readdirSync(join(ROOT, "skills")).filter((d) => d.startsWith("mc-")).sort();

test("the WebUI lists exactly the skills in skills/", () => {
  assert.ok(onDisk.length >= 29);
  const ids = listed.map((s) => s.id);
  assert.deepEqual(onDisk.filter((d) => !ids.includes(d)), [], "missing from the WebUI list");
  assert.deepEqual(ids.filter((id) => !onDisk.includes(id)), [], "listed but not in skills/");
  assert.equal(new Set(ids).size, ids.length, "duplicate entries");
});

test("every listed skill has a name and a short description", () => {
  const bad = listed.filter((s) => !s.name || !s.description || s.description.length > 20).map((s) => s.id);
  assert.deepEqual(bad, []);
});

test("no WebUI component keeps its own hard-coded skill list", () => {
  // The sidebar carried a second literal list that the SKILLS fix missed.
  const names = listed.map((s) => s.name).filter((n) => n.length > 3);
  const srcDir = join(ROOT, "webui", "src");
  const files = readdirSync(srcDir, { recursive: true }).filter((f) => /\.(tsx?|jsx?)$/.test(f));
  const offenders = files
    .filter((f) => !f.endsWith(join("lib", "types.ts")))
    .filter((f) => {
      const text = readFileSync(join(srcDir, f), "utf-8");
      return names.filter((n) => text.includes(`"${n}"`)).length >= 3;
    });
  assert.ok(files.length >= 10, "webui/src not scanned");
  assert.deepEqual(offenders, []);
});
