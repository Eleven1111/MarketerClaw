import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { extractDeliveryCard } from "../scripts/delivery-card.mjs";
import { SKILLS } from "../scripts/sync-disciplines.mjs";

const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BAR_LINE = /^\s*━{5,}\s*$/m;

// Every fenced block in a SKILL.md that contains ━ bar lines is a card template
// the model is told to reproduce — i.e. the real input finalize.mjs receives.
function cardTemplates() {
  const cards = [];
  for (const skill of readdirSync(join(ROOT, "skills"))) {
    let md;
    try {
      md = readFileSync(join(ROOT, "skills", skill, "SKILL.md"), "utf-8");
    } catch {
      continue;
    }
    for (const m of md.matchAll(/^(`{3,})[^\n]*\n([\s\S]*?)^\1\s*$/gm)) {
      if (BAR_LINE.test(m[2])) cards.push({ skill, card: m[2].trim() });
    }
  }
  return cards;
}

const TEMPLATES = cardTemplates();

test("every skill card template is found (guards against a vacuous loop)", () => {
  assert.ok(TEMPLATES.length >= 26, `only ${TEMPLATES.length} card templates found`);
});

test("every skill that finalizes a campaign file has its own card template", () => {
  // finalize.mjs falls back to a generic card when none is found, so a skill
  // with no template fails silently (mc-analytics had none until 2026-09).
  const withCard = new Set(TEMPLATES.map((t) => t.skill));
  const missing = Object.entries(SKILLS)
    .filter(([skill, spec]) => spec.files && !withCard.has(skill))
    .map(([skill]) => skill);
  assert.deepEqual(missing, []);
});

test("each real skill card is extracted whole from the end of a document", () => {
  for (const { skill, card } of TEMPLATES) {
    const doc = `# 产出\n\n正文第一段。\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n${card}\n\n如需展开，说"展开 XX"。\n`;
    assert.equal(extractDeliveryCard(doc), card, `${skill}: card not extracted intact`);
  }
});

test("an example card earlier in the body is skipped in favour of the final card", () => {
  const [{ card: example }, { card: real }] = [TEMPLATES[0], TEMPLATES[TEMPLATES.length - 1]];
  const doc = `# 文档\n下面是示例：\n\n${example}\n\n正文继续，多行内容。\n第二行。\n\n${real}\n`;
  assert.equal(extractDeliveryCard(doc), real);
});

test("returns null when the document has no card", () => {
  assert.equal(extractDeliveryCard("# 文档\n没有交付卡。\n"), null);
  assert.equal(extractDeliveryCard("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n只有一条线"), null);
});

test("finalize.mjs prints the full card body, not just a separator line", async () => {
  const ws = mkdtempSync(join(tmpdir(), "mc-card-"));
  try {
    const brand = TEMPLATES.find((t) => t.skill === "mc-brand").card;
    const input = join(ws, "in.md");
    writeFileSync(input, `# 品牌策略\n\n正文……\n\n${brand}\n`);
    const { stdout } = await run(
      "node",
      [join(ROOT, "scripts", "finalize.mjs"), "--slug", "card", "--step", "brand", "--file", "brand.md", "--input", input],
      { cwd: ws, env: { ...process.env, MC_WORKSPACE: ws } }
    );
    assert.equal(stdout.trim(), brand);
    assert.match(stdout, /执行摘要/);
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
});
