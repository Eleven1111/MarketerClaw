import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p) => readFileSync(join(ROOT, ...p), "utf-8");
const lineCount = (t) => t.split("\n").length - (t.endsWith("\n") ? 1 : 0);

const SHARD_A_FILES = [
  "skills/mc-research/SKILL.md",
  "skills/mc-diagnose/SKILL.md",
  "skills/mc-cmo/SKILL.md",
  "skills/mc-cmo/frameworks/judgment.md",
  "skills/mc-campaign/SKILL.md",
  "skills/mc-dtc/SKILL.md",
  "skills/mc-compete/SKILL.md",
];

test("mc-research carries query brand-pollution 3-layer peeling and anti-empty persona gate", () => {
  const text = read("skills/mc-research/SKILL.md");
  for (const term of [
    "品牌污染度",
    "认知层",
    "认可层",
    "认购层",
    "无品牌痛点簇占比",
    "反空泛人口学画像门禁",
    "去标签盲测",
    "mc-brand",
    "mc-campaign",
  ]) {
    assert.ok(text.includes(term), `mc-research/SKILL.md missing "${term}"`);
  }
});

test("mc-diagnose dimension 5 carries search-conversion scissors gap check", () => {
  const text = read("skills/mc-diagnose/SKILL.md");
  for (const term of [
    "搜转剪刀差",
    "搜索—转化承接漏损",
    "Message Match",
    "纯买量/渠道依赖风险",
  ]) {
    assert.ok(text.includes(term), `mc-diagnose/SKILL.md missing "${term}"`);
  }
});

test("mc-cmo and judgment.md enforce momentum-buying granularity mismatch interception", () => {
  const cmo = read("skills/mc-cmo/SKILL.md");
  const judgment = read("skills/mc-cmo/frameworks/judgment.md");
  for (const term of [
    "势能—买量颗粒度错配",
    "四阶竞争势能买量扩圈门禁",
    "泛品类大词",
  ]) {
    assert.ok(cmo.includes(term), `mc-cmo/SKILL.md missing "${term}"`);
  }
  for (const term of [
    "势能—买量颗粒度错配",
    "常见需要质疑的场景",
    "高危烧钱项",
  ]) {
    assert.ok(judgment.includes(term), `mc-cmo/frameworks/judgment.md missing "${term}"`);
  }
});

test("mc-campaign and mc-dtc enforce 4-stage momentum buying gate and zero-budget BD leverage", () => {
  const campaign = read("skills/mc-campaign/SKILL.md");
  for (const term of [
    "四阶竞争势能买量扩圈门禁",
    "L1 单品验证期",
    "L2 细分品牌期",
    "L3 品类头部期",
    "L4 跨界破圈期",
    "同客群非竞争品类异业 BD 置换",
    "异业",
    "禁止刷单",
    "不得违规诱导站外交易",
  ]) {
    assert.ok(campaign.includes(term), `mc-campaign/SKILL.md missing "${term}"`);
  }

  const dtc = read("skills/mc-dtc/SKILL.md");
  for (const term of [
    "四阶竞争势能买量扩圈门禁",
    "L1 单品验证期",
    "势能—买量颗粒度错配",
  ]) {
    assert.ok(dtc.includes(term), `mc-dtc/SKILL.md missing "${term}"`);
  }
  const dtcLines = lineCount(dtc);
  assert.ok(dtcLines <= 786, `mc-dtc/SKILL.md has ${dtcLines} lines (hard cap 786)`);
});

test("mc-compete enforces structural counter-positioning check and C+/A+ value curve reallocation", () => {
  const compete = read("skills/mc-compete/SKILL.md");
  for (const term of [
    "结构性反打",
    "战术微调",
    "结构性不能",
    "C+/A+ 价值曲线重配",
    "C+",
    "A+",
    "禁止商业诋毁",
  ]) {
    assert.ok(compete.includes(term), `mc-compete/SKILL.md missing "${term}"`);
  }
});

test("Shard A files obey line caps, discipline blocks, and zero external attribution", () => {
  const forbidden = /穷营销|波旬|他化自在天|兔博士|万表网|[\u200B-\u200D\u2060\uFEFF]/;
  for (const rel of SHARD_A_FILES) {
    const text = read(rel);
    assert.ok(!forbidden.test(text), `${rel} contains forbidden external attribution or zero-width char`);
    if (rel.endsWith("SKILL.md")) {
      const n = lineCount(text);
      assert.ok(n <= 799, `${rel} has ${n} lines (cap 799)`);
      if (rel !== "skills/mc-cmo/SKILL.md") {
        assert.ok(
          text.includes("<!-- mc-disciplines:start") && text.includes("<!-- mc-disciplines:end -->"),
          `${rel} missing mc-disciplines block`
        );
      }
    }
  }
});
