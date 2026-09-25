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
    for (const file of spec.files) {
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
    assert.ok(text.includes("### 产出流程"), `${skill}: lifecycle missing`);
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
