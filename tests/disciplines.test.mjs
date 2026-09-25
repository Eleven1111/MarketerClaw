import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SKILLS,
  START,
  END,
  stepFor,
  renderBlock,
  applyBlock,
  skillDirs,
  drift,
} from "../scripts/sync-disciplines.mjs";

// ICE, data-confidence and the setup/finalize lifecycle used to live only in
// mc-cmo, so a /mc-xxx direct call or a single-skill install never saw them.
// Each skill now carries a generated block; these tests keep the block, the
// applicability table and the rest of the system (orchestrate, WebUI) in line.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (skill) => readFileSync(join(ROOT, "skills", skill, "SKILL.md"), "utf-8");
const withoutBlock = (text) => {
  const s = text.indexOf(START);
  return s < 0 ? text : text.slice(0, s) + text.slice(text.indexOf(END, s) + END.length);
};

test("every skill is listed and every block matches the templates", () => {
  assert.ok(skillDirs().length >= 29);
  assert.deepEqual(drift(), []);
});

test("each listed output file is one the skill or mc-orchestrate actually names", () => {
  const orchestrate = read("mc-orchestrate");
  const missing = [];
  for (const [skill, spec] of Object.entries(SKILLS)) {
    if (spec.none) continue;
    const body = withoutBlock(read(skill));
    for (const file of spec.files ?? []) {
      const inSkill = body.includes(`campaigns/{slug}/${file}`) || body.includes(`campaigns/{project-slug}/${file}`);
      const inTable = orchestrate.includes(`| ${skill} | ${file} |`);
      if (!inSkill && !inTable) missing.push(`${skill}: ${file}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("step names match the WebUI step ids for the same skill", () => {
  const types = readFileSync(join(ROOT, "webui", "src", "lib", "types.ts"), "utf-8");
  const webui = [...types.matchAll(/\{ id: "([^"]+)",[^}]*skill: "(mc-[^"]+)"/g)].map(([, id, skill]) => ({ id, skill }));
  assert.ok(webui.length >= 20, "WORKFLOW_STEPS not found");
  const mismatched = webui
    .filter(({ id, skill }) => !SKILLS[skill].files?.some((f) => stepFor(f) === id))
    .map(({ id, skill }) => `${skill} has no output with step "${id}"`);
  assert.deepEqual(mismatched, []);
});

test("no skill still points at mc-cmo for a discipline it now carries itself", () => {
  const stale = skillDirs().filter((s) => /mc-cmo 的(数据置信|ICE)|不需要每个技能单独声明/.test(read(s)));
  assert.deepEqual(stale, []);
});

test("blocks carry exactly the disciplines listed for the skill", () => {
  for (const [skill, spec] of Object.entries(SKILLS)) {
    const text = read(skill);
    if (spec.none) {
      assert.ok(!text.includes(START), `${skill} should have no block`);
      continue;
    }
    assert.equal(text.includes("### 产出流程"), Boolean(spec.files), `${skill}: lifecycle section`);
    assert.equal(text.includes("### 品牌记忆格式"), Boolean(spec.memory), `${skill}: memory section`);
    assert.equal(text.includes("### ICE 评分"), Boolean(spec.ice), `${skill}: ICE section`);
    assert.equal(text.includes("### 数据置信分级"), Boolean(spec.confidence), `${skill}: confidence section`);
  }
});

test("renderBlock fills single- and multi-file skills", () => {
  const tpl = (name) => ({ lifecycle: "L {{skill}} {{step}} {{file}}\n\n{{modes}}\n\nend", ice: "I", confidence: "C" })[name];
  assert.equal(renderBlock("mc-x", { none: "why" }, tpl), null);
  const one = renderBlock("mc-x", { files: ["x.md"], ice: true }, tpl);
  assert.match(one, /L mc-x x x\.md\n\nend\n\nI\n/);
  assert.ok(!one.includes("C"));
  const many = renderBlock("mc-y", { files: ["a.md", "dir/{p}.md"], confidence: true }, tpl);
  assert.match(many, /L mc-y \{step\} \{file\}\n\n本技能按模式产出不同文件.*`a` → `a\.md`；`dir` → `dir\/\{p\}\.md`。\n\nend/);
  assert.ok(many.includes("\n\nC\n"));
});

test("applyBlock inserts before the delivery section, then replaces in place", () => {
  const doc = "# S\n\nbody\n\n## 交付格式\n\ncard\n";
  const once = applyBlock(doc, `${START}\nv1\n${END}`);
  assert.ok(once.indexOf("v1") < once.indexOf("## 交付格式"));
  const twice = applyBlock(once, `${START}\nv2\n${END}`);
  assert.ok(twice.includes("v2") && !twice.includes("v1"));
  assert.equal(applyBlock(twice, `${START}\nv2\n${END}`), twice);
  assert.match(applyBlock("# S\nbody\n", `${START}\nv\n${END}`), /body\n\n---\n\n<!-- mc-disciplines:start/);
});

// ── brand-memory schema ─────────────────────────────────────────────────────
// Writers used section names mc-memory's layered template did not have, and
// mc-insight wrote unverified insights into the resident layer mc-cmo loads
// first. The schema table in templates/disciplines/memory.md is the contract.

const memoryTemplate = readFileSync(join(ROOT, "templates", "disciplines", "memory.md"), "utf-8");

function memorySchema(text) {
  return [...text.matchAll(/^\| (常驻层|档案层|分隔) \| `([^`]+)` \|[^\n]*\| ([^|\n]+) \|$/gm)].map(([, layer, key, writers]) => ({
    layer,
    key,
    section: key.startsWith("## ") ? key.slice(3) : null,
    writers: writers.trim(),
  }));
}

const schema = memorySchema(memoryTemplate);
const MARKER = schema.find((r) => r.layer === "分隔")?.key;

test("the seed brand-memory.md has exactly the schema's sections, in order", () => {
  assert.ok(schema.length >= 8 && MARKER?.startsWith("<!-- ARCHIVE BELOW"), "schema table not parsed");
  const seed = readFileSync(join(ROOT, "memory", "brand-memory.md"), "utf-8");
  const layout = seed
    .split("\n")
    .filter((l) => l.startsWith("## ") || l.startsWith("<!-- ARCHIVE BELOW"))
    .map((l) => l.trim());
  assert.deepEqual(layout, schema.map((r) => r.key));
});

test("memory writers only write sections the schema assigns to them", () => {
  const problems = [];
  for (const [skill, spec] of Object.entries(SKILLS)) {
    if (!spec.memory || skill === "mc-memory") continue; // mc-memory administers every section
    const body = withoutBlock(read(skill));
    for (const line of body.split("\n")) {
      if (!/写入|追加|补充/.test(line)) continue;
      for (const [, name] of line.matchAll(/`## ([^`]+)`/g)) {
        const row = schema.find((r) => r.section === name);
        if (!row) problems.push(`${skill}: writes "## ${name}", which is not in the schema`);
        else if (!row.writers.includes(skill) && !row.writers.includes("所有写回技能"))
          problems.push(`${skill}: writes "## ${name}", owned by ${row.writers}`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test("unverified output never targets the resident layer", () => {
  const resident = schema.filter((r) => r.layer === "常驻层").map((r) => r.section);
  const insight = withoutBlock(read("mc-insight"));
  const targets = [...insight.matchAll(/(?:追加到|写入|补充到) `## ([^`]+)`/g)].map((m) => m[1]);
  assert.ok(targets.length >= 2, "mc-insight write-back not found");
  assert.deepEqual(targets.filter((t) => resident.includes(t)), []);
});
