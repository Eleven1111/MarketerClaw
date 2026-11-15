import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Standalone guard suite for the crisis-PR triage & sentiment governance pack (Shard A: P0-1..3):
// 1. Line caps on all skills/mc-*/SKILL.md (<= 799; mc-analytics frozen at 883) and crisis-triage-matrix.md (80..399)
// 2. Two-way reference wiring for mc-diagnose (no orphan, no dangling pointer)
// 3. Zero external case/source attribution and zero-width char check
// 4. PR crisis black-hat advice scanner (PR_CRISIS_BLACKHAT) + adversarial unit tests
// 5. Structural anchors in crisis-triage-matrix.md, mc-diagnose, mc-cmo, mc-monitor, mc-review + intact discipline blocks

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(ROOT, "skills");
const TEMPLATES = join(ROOT, "templates");

const LEGACY_OVERSIZE = { "mc-analytics": 883 };

// Valid negations only: excludes false-negation substrings 不得已/不得了/不得不/不要怕/不能不
const NEGATION_G = /不得(?![已了不])|不要(?!怕)|不能(?!不)|禁止|不写|❌|严禁|绝不|切勿|杜绝|避免|(?<!切)勿/g;
const SPEECH_G = /(?:["“]([^"”]*)["”]|「([^」]*)」|『([^』]*)』)/g;
const CLAUSE_SPLIT = /[|，,；;。！？（）()]+|——|--/;
const NB = "[^\\n，,；;。！？|]"; // in-clause gap char

export const PR_CRISIS_BLACKHAT = [
  { re: new RegExp(`制造${NB}{0,10}供不应求(?:的)?假象`), why: "fake scarcity manipulation (反不正当竞争法 虚假宣传)" },
  { re: new RegExp(`强行${NB}{0,4}架离`), why: "forcibly removing complaining consumers on site (消费者权益保护法、治安管理处罚法)" },
  { re: new RegExp(`花钱${NB}{0,4}撤${NB}{0,3}热搜`), why: "paid trending-topic removal (网络信息内容生态治理规定)" },
  { re: /删帖[、，/\s]{0,2}压热搜/, why: "post deletion to suppress trending topics" },
  { re: /不转不是[^\s，,；;。！？"'”」』（）()|]{1,8}/, why: "coercive moral-blackmail share bait (诱导分享、广告法第九条第七项)" },
  { re: new RegExp(`隐蔽${NB}{0,3}软植${NB}{0,3}不标${NB}{0,2}广告`), why: "undisclosed covert advertising (互联网广告管理办法第九条)" },
];

function isExcused(scope, re) {
  const termMatch = scope.match(re);
  if (!termMatch) return true;
  // A valid negation must precede the banned practice within the same clause/quote
  for (const neg of scope.matchAll(NEGATION_G)) {
    if (neg.index < termMatch.index) return true;
  }
  return false;
}

// Quotes and unquoted text are judged independently: a negated quote never shields
// unquoted positive advice on the same line, and vice versa.
function lineViolates(line, re) {
  if (!re.test(line)) return false;
  const speeches = [...line.matchAll(SPEECH_G)].map((m) => m[1] ?? m[2] ?? m[3]);
  const outside = line.replace(SPEECH_G, "◇"); // inert token: must not be in CLAUSE_SPLIT, or it severs a negation from its object
  const scopes = speeches.filter((s) => re.test(s));
  const clauses = outside.split(CLAUSE_SPLIT).filter((c) => re.test(c));
  scopes.push(...clauses);
  // Term spans a clause separator (e.g. "删帖，压热搜"): judge the whole line
  if (scopes.length === 0) scopes.push(re.test(outside) ? outside : line);
  return scopes.some((s) => !isExcused(s, re));
}

export function violations(text, banned = PR_CRISIS_BLACKHAT) {
  const found = [];
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    for (const { re, why } of banned) {
      if (lineViolates(line, re)) found.push(`L${i + 1}: ${line.trim().slice(0, 70)} — ${why}`);
      // Single-newline split: scan the normalized join of adjacent lines for terms neither line holds alone
      const next = lines[i + 1];
      if (next === undefined || re.test(line) || re.test(next)) continue;
      const joined = line.trimEnd() + next.trimStart();
      if (lineViolates(joined, re)) found.push(`L${i + 1}-${i + 2}: ${joined.trim().slice(0, 70)} — ${why}`);
    }
  });
  return found;
}

const mcDirs = () => readdirSync(SKILLS).filter((d) => d.startsWith("mc-"));
const read = (...p) => readFileSync(join(ROOT, ...p), "utf-8");
const lineCount = (t) => t.split("\n").length - (t.endsWith("\n") ? 1 : 0);
const MATRIX = ["skills", "mc-diagnose", "references", "crisis-triage-matrix.md"];

function localReferencedMd(skillText) {
  const stripped = skillText.replace(/skills\/mc-[\w-]+\/references\/[\w.-]+\.md/g, "");
  return [...stripped.matchAll(/references\/([\w.-]+\.md)/g)].map((m) => m[1]);
}

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

function nonReviewDocs() {
  const docs = [];
  for (const d of mcDirs().filter((x) => x !== "mc-review")) {
    docs.push([`${d}/SKILL.md`, read("skills", d, "SKILL.md")]);
    const refs = join(SKILLS, d, "references");
    if (existsSync(refs)) {
      for (const f of readdirSync(refs).filter((x) => x.endsWith(".md"))) {
        docs.push([`${d}/references/${f}`, readFileSync(join(refs, f), "utf-8")]);
      }
    }
  }
  return docs;
}

test("every skills/mc-*/SKILL.md stays within 799 lines and crisis-triage-matrix.md stays in 80..399 lines", () => {
  const dirs = mcDirs();
  assert.ok(dirs.length >= 25, `expected >= 25 skills, found ${dirs.length}`);
  for (const d of dirs) {
    const n = lineCount(read("skills", d, "SKILL.md"));
    const cap = LEGACY_OVERSIZE[d] ?? 799;
    assert.ok(n <= cap, `${d}/SKILL.md has ${n} lines (cap ${cap})`);
  }
  const m = lineCount(read(...MATRIX));
  assert.ok(m >= 80 && m < 400, `crisis-triage-matrix.md has ${m} lines (expected 80..399)`);
});

test("mc-diagnose on-demand reference files are wired both ways", () => {
  const text = read("skills", "mc-diagnose", "SKILL.md");
  const refDir = join(SKILLS, "mc-diagnose", "references");
  assert.ok(existsSync(refDir), "missing references dir for mc-diagnose");
  const mentioned = new Set(localReferencedMd(text));
  assert.ok(mentioned.has("crisis-triage-matrix.md"), "mc-diagnose/SKILL.md must reference references/crisis-triage-matrix.md");
  for (const f of mentioned) {
    assert.ok(existsSync(join(refDir, f)), `mc-diagnose/SKILL.md points at missing references/${f}`);
  }
  for (const f of readdirSync(refDir).filter((x) => x.endsWith(".md"))) {
    assert.ok(mentioned.has(f), `orphan reference file not wired in mc-diagnose/SKILL.md: ${f}`);
  }
  assert.ok(statSync(join(ROOT, ...MATRIX)).isFile());
});

test("zero external case/source attribution or zero-width chars in skills/ and templates/", () => {
  // Encoded as \u escapes so external source/case names never appear as plain-text search hits in the public repo
  const ATTR_RE =
    /\u817e\u8baf\u516c\u5173|3Q\u5927\u6218|\u4f18\u5361\u4e39|\u8fbe\u82ac\u5947\u5bb6\u5c45|\u738b\u601d\u806a|\u7f57\u6c38\u6d69|\u738b\u81ea\u5982|\u51b0\u6876\u6311\u6218/i;
  const ZW_RE = /[\u200B-\u200D\u2060\uFEFF]/;
  const allMd = [...walkMdFiles(SKILLS, "skills"), ...walkMdFiles(TEMPLATES, "templates")];
  assert.ok(allMd.length >= 30, `expected >= 30 markdown files, found ${allMd.length}`);
  const badAttr = [];
  const badZw = [];
  for (const [rel, text] of allMd) {
    const m = text.match(ATTR_RE);
    if (m) badAttr.push(`${rel}: found forbidden term (len ${m[0].length})`);
    if (ZW_RE.test(text)) badZw.push(`${rel}: contains zero-width character`);
  }
  assert.deepEqual(badAttr, []);
  assert.deepEqual(badZw, []);
});

test("no non-review skill or reference teaches a PR_CRISIS_BLACKHAT practice", () => {
  const docs = nonReviewDocs();
  assert.ok(docs.some(([n]) => n === "mc-diagnose/references/crisis-triage-matrix.md"), "crisis-triage-matrix.md must be scanned");
  const found = docs.flatMap(([name, text]) => violations(text).map((v) => `${name} ${v}`));
  assert.deepEqual(found, []);
});

test("PR_CRISIS_BLACKHAT scanner catches advice and multi-clause/table/quote bypasses while passing prohibitions", () => {
  const adviceLines = [
    "新品首发时先制造供不应求假象拉高讨论度",
    "维权顾客在门店直播时由保安强行架离",
    "负面上榜后立刻找渠道花钱撤热搜",
    "连夜删帖压热搜把话题降温",
    "裂变海报文案：不转不是中国人，转发抽奖",
    "澄清稿里隐蔽软植不标广告顺带推新品",
  ];
  assert.equal(adviceLines.length, PR_CRISIS_BLACKHAT.length);
  for (const line of adviceLines) {
    assert.equal(violations(line).length, 1, `should flag positive advice: ${line}`);
  }

  const prohibitionLines = [
    "禁止制造供不应求假象误导消费者",
    "不得强行架离现场维权的消费者",
    "禁止花钱撤热搜等非法交易",
    "不得删帖压热搜掩盖事实",
    "❌ 不转不是中国人类道德绑架话术",
    "不要隐蔽软植不标广告",
  ];
  assert.equal(prohibitionLines.length, PR_CRISIS_BLACKHAT.length);
  for (const line of prohibitionLines) {
    assert.equal(violations(line).length, 0, `should pass prohibition: ${line}`);
  }

  // Adversarial bypasses: mixed clause, table cell, trailing note on quote, second quote,
  // CJK corner brackets, em-dash + post-term negation, modifier insertion
  const bypasses = [
    "禁止辱骂网友，但热度过高时可花钱撤热搜",
    "| 禁止删帖压热搜 | 必要时安排保安强行架离 |",
    '危机口径："先找人删帖压热搜"（内部禁止外传）',
    '对外声明："我们绝不花钱撤热搜"，私下部署："今晚安排删帖压热搜"',
    "海报标题「不转不是中国人」（禁止截图外泄）",
    "表面禁止硬刚——私下花钱撤热搜但不要留痕",
    "首发当天刻意制造出供不应求的假象带节奏",
    "澄清长文——隐蔽软植不标广告，不得被发现",
  ];
  for (const line of bypasses) {
    assert.ok(violations(line).length >= 1, `should catch adversarial bypass: ${line}`);
  }

  // Verifier adversarial suite (18 cases): true = must flag, false = must pass
  const verifierCases = [
    ["不得已时可以花钱撤热搜", true],
    ["不要怕花钱撤热搜，效果立竿见影", true],
    ["不能不删帖压热搜", true],
    ["连夜删帖、压热搜", true],
    ["找渠道花钱撤掉热搜", true],
    ["不转不是中华儿女，转发抽奖", true],
    ['推荐做法：花钱撤热搜（参见"禁止花钱撤热搜"）', true],
    ["必要时可以花钱撤\n热搜", true],
    ["简直不得了地制造供不应求假象", true],
    ["严禁花钱撤热搜", false],
    ["我们绝不删帖压热搜", false],
    ["切勿隐蔽软植不标广告", false],
    ["杜绝强行架离维权顾客", false],
    ["禁止：花钱撤热搜", false],
    ["禁止辱骂；花钱撤热搜可以", true],
    ["删帖压热搜是不得已的选择", true],
    ["制造不会被发现的供不应求假象", true],
    ["制造一种不会被发现的供不应求假象", true],
  ];
  assert.equal(verifierCases.length, 18);

  // Negated prohibitions with inline quoted examples must not be split across the quote
  for (const line of [
    "不得以「限量」「抢不到」等人为制造供不应求假象",
    "禁止让 KOC 以「素人自发分享」名义做隐蔽软植、不标广告",
  ]) {
    assert.equal(violations(line).length, 0, `inline-quote prohibition should pass: ${line}`);
  }
  const mismatched = verifierCases
    .filter(([line, flag]) => (violations(line).length >= 1) !== flag)
    .map(([line, flag]) => `${flag ? "missed" : "false positive"}: ${line}`);
  assert.deepEqual(mismatched, []);
});

test("crisis triage pack (P0-1..3) anchors are wired with intact discipline blocks", () => {
  const matrix = read(...MATRIX);
  for (const anchor of [
    "负面→危机三级前置分流门禁",
    "外松内紧",
    "Tier 1",
    "Tier 2",
    "Tier 3",
    "权威媒体 / 政务号首发",
    "冲上平台热搜 / 热榜",
    "包含 ≥2 种公众高敏情绪叠加",
    "过失×声量 2×2 四象限",
    "禁止在声明中复述谣言原话",
    "禁止在舆情早期向普通消费者 / 网友发律师函威胁",
    "先合情、再合理",
    "外部舆论魔鬼代言人",
    "一线免 KPI 扣罚快速赔付授权池",
    "锁界致歉",
    "转换故事",
    "Mode B：品牌舆情与危机流速监控",
    "判定顺序（自上而下，命中即停）",
    "即使名义上符合国标",
    "不得向发帖人寄送律师函",
    "不得要求删帖或改口，不得索取无关个人信息，不得暗示法律后果，全程留痕",
    "仅限完成致歉与受损个体赔付落定后启用",
  ]) {
    assert.ok(matrix.includes(anchor), `crisis-triage-matrix.md missing "${anchor}"`);
  }
  const signals = matrix.match(/^\| [①②③④⑤⑥⑦⑧⑨⑩] \|/gm) ?? [];
  assert.equal(signals.length, 10, "crisis-triage-matrix.md must list exactly 10 escalation signals");

  const diagnose = read("skills", "mc-diagnose", "SKILL.md");
  for (const anchor of [
    "references/crisis-triage-matrix.md",
    "负面→危机三级前置分流门禁",
    "过失×声量 2×2 四象限",
    "先合情、再合理",
    "一线免 KPI 扣罚快速赔付授权池",
    "锁界致歉",
    "Mode B：品牌舆情与危机流速监控",
    "危机前线四道止血闸门与分级发言收口协议",
  ]) {
    assert.ok(diagnose.includes(anchor), `mc-diagnose/SKILL.md missing "${anchor}"`);
  }
  assert.ok(!diagnose.includes("mc-monitor（竞品和行业动态监控）"), "mc-diagnose still routes PR sentiment to sales-only monitor");

  const cmo = read("skills", "mc-cmo", "SKILL.md");
  const judgment = read("skills", "mc-cmo", "frameworks", "judgment.md");
  for (const anchor of ["负面冲动发声拦截", "发公开声明辟谣", "发律师函警告网友", "Tier 1/2/3", "负面→危机三级前置分流门禁", "不可协商红线"]) {
    assert.ok(cmo.includes(anchor), `mc-cmo/SKILL.md missing "${anchor}"`);
  }
  for (const anchor of ["负面冲动发声", "逆火效应", "Tier 1/2/3"]) {
    assert.ok(judgment.includes(anchor), `mc-cmo/frameworks/judgment.md missing "${anchor}"`);
  }

  const monitor = read("skills", "mc-monitor", "SKILL.md");
  for (const anchor of [
    "Mode A：货盘与竞品销量监控",
    "Mode B：品牌舆情与危机流速监控",
    "10 项危机升格信号",
    "5 类公众高敏情绪叠加雷达",
    "价格背刺",
    "爹味教育消费者",
    "宠物安全",
    "打工人共情投射",
    "地域 / 性别 / 文化符号冒犯",
    "跨平台外溢",
    "群聊截图搬运",
    "舆情流速与情绪燃点看板",
    "{当前年份}",
    "实测 / 估算 / 推断",
    "### 数据置信分级",
  ]) {
    assert.ok(monitor.includes(anchor), `mc-monitor/SKILL.md missing "${anchor}"`);
  }
  const board = monitor.slice(monitor.indexOf("## 舆情流速与情绪燃点看板"));
  assert.ok(!/20\d\d/.test(board.slice(0, board.indexOf("```"))), "Mode B output template must not hardcode a year");

  const review = read("skills", "mc-review", "SKILL.md");
  for (const anchor of [
    "危机声明反次生灾害 7 项否决检视",
    "核心正式声明 ≤600 字",
    "外包机构个人行为",
    "荒唐可笑",
    "行业惯例",
    "视觉物料周边泄密与 PII 脱敏审计",
    "内部后台网址",
    "PII 打码",
    "虚假奖牌",
    "社交裂变反道德绑架与胁迫诱导分享拦截",
    "不转不是XX",
    "人格过载防线",
  ]) {
    assert.ok(review.includes(anchor), `mc-review/SKILL.md missing "${anchor}"`);
  }
  const cn = read("skills", "mc-review", "references", "compliance-cn.md");
  assert.ok(cn.includes("last_verified: 2026-09-25"), "compliance-cn.md last_verified must stay unchanged");
  assert.ok(cn.includes("道德绑架式诱导分享"), "compliance-cn.md missing coercive share-bait row");

  for (const d of ["mc-diagnose", "mc-monitor", "mc-review"]) {
    const t = read("skills", d, "SKILL.md");
    assert.ok(
      t.includes("<!-- mc-disciplines:start") && t.includes("<!-- mc-disciplines:end -->"),
      `${d}/SKILL.md lost its mc-disciplines block`,
    );
  }
});
