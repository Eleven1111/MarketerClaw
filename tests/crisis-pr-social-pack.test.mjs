import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Standalone guard suite for the Crisis PR & Social Governance Pack (Shard B):
// 1. Line caps on all skills/mc-*/SKILL.md (<= 799; mc-analytics frozen at 883)
// 2. Zero external attribution & zero-width chars across skills/ and templates/
// 3. Structural anchors for P1-1..3, P2-1..2 in the 7 Shard B skills + intact mc-disciplines blocks

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(ROOT, "skills");
const TEMPLATES = join(ROOT, "templates");

const LEGACY_OVERSIZE = { "mc-analytics": 883 };

const mcDirs = () => readdirSync(SKILLS).filter((d) => d.startsWith("mc-"));
const read = (...p) => readFileSync(join(ROOT, ...p), "utf-8");
const lineCount = (t) => t.split("\n").length - (t.endsWith("\n") ? 1 : 0);

function walkMdFiles(dir, base = "") {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;
    if (statSync(full).isDirectory()) results.push(...walkMdFiles(full, rel));
    else if (entry.endsWith(".md")) results.push([rel, readFileSync(full, "utf-8")]);
  }
  return results;
}

test("every skills/mc-*/SKILL.md stays within its line cap", () => {
  const dirs = mcDirs();
  assert.ok(dirs.length >= 25, `expected >= 25 skills, found ${dirs.length}`);
  for (const d of dirs) {
    const n = lineCount(read("skills", d, "SKILL.md"));
    const cap = LEGACY_OVERSIZE[d] ?? 799;
    assert.ok(n <= cap, `${d}/SKILL.md has ${n} lines (cap ${cap})`);
  }
});

test("zero external attribution or zero-width chars in skills/ and templates/", () => {
  // Encoded as \u escapes so external source/case names never appear as plain-text search hits in public repo
  const ATTR_RE = /\u7a77\u8425\u9500|\u6ce2\u65ec|\u4ed6\u5316\u81ea\u5728\u5929|\u5154\u535a\u58eb|\u4e07\u8868\u7f51/;
  const ZW_RE = /[\u200B-\u200D\u2060\uFEFF]/;
  const allMd = [...walkMdFiles(SKILLS, "skills"), ...walkMdFiles(TEMPLATES, "templates")];
  assert.ok(allMd.length >= 30, `expected >= 30 markdown files, found ${allMd.length}`);
  const bad = [];
  for (const [rel, text] of allMd) {
    if (ATTR_RE.test(text)) bad.push(`${rel}: external attribution`);
    if (ZW_RE.test(text)) bad.push(`${rel}: zero-width character`);
  }
  assert.deepEqual(bad, []);
});

test("Shard B skills carry the crisis-PR & social governance upgrades", () => {
  const expected = {
    "mc-kol": [
      "互联网广告管理办法第九条",
      "跨垂类头部立势能 × 草根同温层补信任",
      "蒲公英 / 星图 / 花火",
      "合作前 5 类高危历史言行背调排雷",
      "惯性转发未经核实的负面谣言",
      "坐地起价",
      "30 秒防恶意切片",
      "禁用「虽然…但是…」让步复句",
      "禁止说「无可奉告」",
      "核实后反馈的具体时间点",
    ],
    "mc-brand": [
      "对外发言人与引言角色分层纪律",
      "禁止高管亲自下场卷入竞品参数口水战",
      "references/brand-architecture-matrix.md",
      "30% 不变量识别骨架",
      "人格过载黑化防线",
    ],
    "mc-campaign": [
      "上线前 6 项防崩盘红蓝对抗门禁",
      "极端边界锁死与禁改铁律",
      "禁止中途修改核心获奖规则",
      "上线后突发异常补救边界",
      "增量补奖",
      "可审计的风控证据",
      "开放申诉通道",
      "公开延期开奖",
      "规范促销行为暂行规定",
      "UGC 征集原创版权与肖像免责前置",
      "跨平台统一权威释疑锚点",
      "联合主办 / 联名伙伴对等双签机制",
      "高并发降级与直播备用流预案",
      "「把选择权交还用户」真实双方案 PK 与阶梯共创机制",
      "禁止虚构陪跑方案",
      "禁止虚假饥饿营销",
      "四阶竞争势能买量扩圈门禁",
    ],
    "mc-community": [
      "T+7 / T+30 闭环回音壁铁律",
      "已落地项",
      "排期开发项",
      "暂无法实现及真实原因",
      "反抽奖羊毛粉膨胀防线",
      "平台导流红线",
      "不得以好评",
    ],
    "mc-content": [
      "「第三方行业观察者」深度综述模型",
      "禁止通篇企业公关自夸腔",
      "日常体感参照物",
      "禁止在面向普通用户的内容里堆砌生僻工程缩写",
      "实测续航 {X} 小时",
      "不得用电池容量 mAh 直接换算天数",
    ],
    "mc-dashboard": [
      "「反虚荣水分」三项校准指标",
      "二次传播率",
      "≥30 字有效深评占比",
      "非活动期自然帖均互动中位数",
    ],
    "mc-storyteller": [
      "「熟悉的陌生人」档案冷知识焕新叙事模型",
      "史实可查证底线",
      "禁止编造虚假百年传奇",
      "社交借口",
    ],
  };
  for (const [skill, anchors] of Object.entries(expected)) {
    const text = read("skills", skill, "SKILL.md");
    assert.ok(
      text.includes("<!-- mc-disciplines:start") && text.includes("<!-- mc-disciplines:end -->"),
      `${skill}/SKILL.md lost its mc-disciplines block`,
    );
    for (const a of anchors) assert.ok(text.includes(a), `${skill}/SKILL.md missing "${a}"`);
  }
});

test("sensory translation never converts raw battery capacity straight into days", () => {
  const content = read("skills", "mc-content", "SKILL.md");
  const rows = content.split("\n").filter((l) => l.trim().startsWith("|") && /mAh/.test(l));
  for (const row of rows) {
    assert.match(row, /不得/, `mAh appears as a translatable parameter, not a prohibition: ${row.trim()}`);
  }
});

test("red-team gate keeps the remedy list after the 6-row table, not inside it", () => {
  const campaign = read("skills", "mc-campaign", "SKILL.md");
  const remedy = campaign.indexOf("上线后突发异常补救边界");
  const row6 = campaign.indexOf("| ⑥ |");
  assert.ok(row6 > 0 && remedy > row6, "remedy boundary must follow row ⑥ so the gate table stays intact");
});

test("new prohibitions are phrased with 禁止/不得, not 严禁 alone", () => {
  const sections = {
    "mc-kol": ["### 「跨垂类头部立势能", "### 创始人/高管播客"],
    "mc-campaign": ["### 线上互动/抽奖/UGC 征集", "### 「把选择权交还用户」"],
    "mc-community": ["### 公开「听劝/吐槽征集」", "### 反抽奖羊毛粉膨胀防线"],
  };
  for (const [skill, heads] of Object.entries(sections)) {
    const text = read("skills", skill, "SKILL.md");
    for (const head of heads) {
      const start = text.indexOf(head);
      assert.ok(start >= 0, `${skill}: section "${head}" not found`);
      const next = text.indexOf("\n### ", start + head.length);
      const body = text.slice(start, next < 0 ? undefined : next);
      assert.match(body, /禁止|不得/, `${skill}: "${head}" carries no 禁止/不得 prohibition`);
      for (const line of body.split("\n")) {
        if (line.includes("严禁")) assert.match(line, /禁止|不得/, `${skill}: 严禁 without 禁止/不得: ${line}`);
      }
    }
  }
});
