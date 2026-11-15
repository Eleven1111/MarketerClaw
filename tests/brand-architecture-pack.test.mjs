import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Standalone guard suite for the brand-architecture, dynamic-VI, persona-overdose & crisis-gate pack:
// 1. Line caps on all skills/mc-*/SKILL.md (<= 799; mc-analytics frozen at 883) and reference (< 400)
// 2. Two-way reference wiring across mc-brand, mc-product, mc-selection (no orphan, no dangling pointer)
// 3. Zero external consulting attribution, P2P poison-pill isolation, and zero-width char check
// 4. Crisis-PR & brand-architecture black-hat advice scanner (CRISIS_ARCH_BLACKHAT) + adversarial unit tests
// 5. All 7 pack items (P0-1..2, P1-1..3, P2-1..2) structurally landed & discipline blocks intact

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(ROOT, "skills");
const TEMPLATES = join(ROOT, "templates");

const LEGACY_OVERSIZE = { "mc-analytics": 883 };

const NEGATION_G = /不得|不要|不能|禁止|不写|❌/g;
const SPEECH_G = /(?:["“]([^"”]*)["”]|「([^」]*)」|『([^』]*)』)/g;
const CLAUSE_SPLIT = /[|，,；;。！？（）()]+|——|--/;

export const CRISIS_ARCH_BLACKHAT = [
  { re: /有偿删帖/, why: "illegal paid post deletion business (网络信息内容生态治理规定)" },
  { re: /付费撤稿/, why: "illegal paid media takedown / extortionate PR" },
  { re: /水军控评/, why: "astroturfing / fake comment manipulation (反不正当竞争法第八条)" },
  { re: /水军洗地/, why: "astroturfing whitewashing in PR crisis" },
  { re: /伪造[^\n，,；;。！？|]{0,6}(检测|质检|检验)报告/, why: "fabricating test/inspection reports (产品质量法、广告法第二十八条)" },
  { re: /虚构海外(实验室|科研机构)/, why: "fabricating overseas R&D lab endorsement (广告法第二十八条)" },
  { re: /伪造集团背景/, why: "fabricating parent corporate endorsement" },
];

function isExcused(scope, re, unless) {
  if (unless && unless.test(scope)) return true;
  const termMatch = scope.match(re);
  if (!termMatch) return true;
  // Negation must precede the banned practice within the clause/quote (prevents "有偿删帖但不要留痕" bypass
  // while preserving parallel object prohibitions like "禁止虚构海外实验室、伪造集团背景")
  for (const neg of scope.matchAll(NEGATION_G)) {
    if (neg.index < termMatch.index) return true;
  }
  return false;
}

export function violations(text, banned = CRISIS_ARCH_BLACKHAT) {
  const found = [];
  text.split("\n").forEach((line, i) => {
    const speeches = [...line.matchAll(SPEECH_G)].map((m) => m[1] ?? m[2] ?? m[3]);
    const clauses = line.split(CLAUSE_SPLIT);
    for (const { re, unless, why } of banned) {
      if (!re.test(line)) continue;
      const matchingSpeeches = speeches.filter((s) => re.test(s));
      if (matchingSpeeches.length > 0) {
        if (matchingSpeeches.every((s) => isExcused(s, re, unless))) continue;
      } else {
        const matchingClauses = clauses.filter((c) => re.test(c));
        const scopes = matchingClauses.length > 0 ? matchingClauses : [line];
        if (scopes.every((s) => isExcused(s, re, unless))) continue;
      }
      found.push(`L${i + 1}: ${line.trim().slice(0, 70)} — ${why}`);
    }
  });
  return found;
}

const mcDirs = () => readdirSync(SKILLS).filter((d) => d.startsWith("mc-"));
const read = (...p) => readFileSync(join(ROOT, ...p), "utf-8");
const lineCount = (t) => t.split("\n").length - (t.endsWith("\n") ? 1 : 0);

function localReferencedMd(skillText) {
  // Strip explicit cross-skill paths like skills/mc-review/references/foo.md before matching local references/
  const stripped = skillText.replace(/skills\/mc-[\w-]+\/references\/[\w.-]+\.md/g, "");
  return [...stripped.matchAll(/references\/([\w.-]+\.md)/g)].map((m) => m[1]);
}

function walkMdFiles(dir, base = "") {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...walkMdFiles(full, rel));
    } else if (entry.endsWith(".md")) {
      results.push([rel, readFileSync(full, "utf-8")]);
    }
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

test("every skills/mc-*/SKILL.md stays within 799 lines and brand-architecture-matrix.md stays under 400 lines", () => {
  const dirs = mcDirs();
  assert.ok(dirs.length >= 25, `expected >= 25 skills, found ${dirs.length}`);
  for (const d of dirs) {
    const n = lineCount(read("skills", d, "SKILL.md"));
    const cap = LEGACY_OVERSIZE[d] ?? 799;
    assert.ok(n <= cap, `${d}/SKILL.md has ${n} lines (cap ${cap})`);
  }
  const matrixLines = lineCount(read("skills", "mc-brand", "references", "brand-architecture-matrix.md"));
  assert.ok(matrixLines >= 60 && matrixLines < 400, `brand-architecture-matrix.md has ${matrixLines} lines (expected 60..399)`);
});

test("on-demand reference files in mc-brand, mc-product, and mc-selection are wired both ways", () => {
  for (const skill of ["mc-brand", "mc-product", "mc-selection"]) {
    const text = read("skills", skill, "SKILL.md");
    const refDir = join(SKILLS, skill, "references");
    assert.ok(existsSync(refDir), `missing references dir for ${skill}`);
    const mentioned = new Set(localReferencedMd(text));
    assert.ok(mentioned.size >= 1, `${skill}/SKILL.md must reference its on-demand reference file`);
    for (const f of mentioned) {
      assert.ok(existsSync(join(refDir, f)), `${skill}/SKILL.md points at missing references/${f}`);
    }
    for (const f of readdirSync(refDir).filter((x) => x.endsWith(".md"))) {
      assert.ok(mentioned.has(f), `orphan reference file not wired in ${skill}/SKILL.md: ${f}`);
    }
  }
  assert.ok(statSync(join(SKILLS, "mc-brand/references/brand-architecture-matrix.md")).isFile());
});

test("zero external attribution, P2P financial poison pill, or zero-width chars in skills/ and templates/", () => {
  // Encoded as \u escapes so external source/case names do not appear as plain-text search hits in public repo
  const ATTR_AND_POISON_RE =
    /\u5965\u7f8e|\u004e\u0065\u0065\u0064\u0053\u0063\u006f\u0070\u0065|\u8f6f\u63a7|\u4e2d\u7cae|\u4e16\u8302|\u6052\u660c|\u79d1\u9f99|\u5730\u4ea7\u58f9\u7ebf|(?<!\u5185)\u5bb9\u58f0(?!\u660e)|P2P\s*互金|P2P\s*理财|稳定财富收益/i;
  const ZW_RE = /[\u200B-\u200D\u2060\uFEFF]/;
  const allMd = [
    ...walkMdFiles(SKILLS, "skills"),
    ...walkMdFiles(TEMPLATES, "templates"),
  ];
  assert.ok(allMd.length >= 30, `expected >= 30 markdown files, found ${allMd.length}`);
  const badAttr = [];
  const badZw = [];
  for (const [rel, text] of allMd) {
    const m = text.match(ATTR_AND_POISON_RE);
    if (m) badAttr.push(`${rel}: found forbidden term "${m[0]}"`);
    if (ZW_RE.test(text)) badZw.push(`${rel}: contains zero-width character`);
  }
  assert.deepEqual(badAttr, []);
  assert.deepEqual(badZw, []);
});

test("no non-review skill or reference teaches a CRISIS_ARCH_BLACKHAT practice", () => {
  const docs = nonReviewDocs();
  assert.ok(docs.some(([n]) => n === "mc-brand/references/brand-architecture-matrix.md"), "brand-architecture-matrix.md must be scanned");
  const found = docs.flatMap(([name, text]) =>
    violations(text, CRISIS_ARCH_BLACKHAT).map((v) => `${name} ${v}`),
  );
  assert.deepEqual(found, []);
});

test("CRISIS_ARCH_BLACKHAT scanner catches positive advice and multi-clause/table/quote bypasses while passing prohibitions", () => {
  const adviceLines = [
    "舆情发酵后第一时间找公关渠道做有偿删帖把负面压下去",
    "联系媒体商务谈付费撤稿消除热搜词条",
    "安排两百个账号进评论区做水军控评把好评顶上来",
    "在话题广场找水军洗地转移视线",
    "连夜P一份伪造第三方检测报告发到官方微博",
    "包装正面印上虚构海外实验室联合研发背书",
    "招商页可伪造集团背景提升代理商信任度",
  ];
  assert.equal(adviceLines.length, CRISIS_ARCH_BLACKHAT.length);
  for (const line of adviceLines) {
    assert.equal(violations(line, CRISIS_ARCH_BLACKHAT).length, 1, `should flag positive advice: ${line}`);
  }

  const prohibitionLines = [
    "禁止有偿删帖等非法公关交易",
    "不得通过付费撤稿掩盖产品质量缺陷",
    "禁止雇佣水军控评操纵舆论",
    "不得找水军洗地欺骗消费者",
    "不得伪造第三方检测报告",
    "禁止虚构海外实验室联合研发",
    "不得伪造集团背景或盗用他人商号",
  ];
  assert.equal(prohibitionLines.length, CRISIS_ARCH_BLACKHAT.length);
  for (const line of prohibitionLines) {
    assert.equal(violations(line, CRISIS_ARCH_BLACKHAT).length, 0, `should pass prohibition: ${line}`);
  }

  // Adversarial bypasses: mixed clause, table cell, trailing note on quote, second quote,
  // CJK corner brackets, un-coloned quote, em-dash + post-term negation, modifier insertion
  const bypasses = [
    "禁止刷单，但危机紧急时可找水军控评稳住评论区",
    "| 禁止有偿删帖 | 必要时安排水军洗地对冲差评 |",
    '公关口径："快找关系做有偿删帖"（内部切勿外传，禁止截图）',
    '对外声明："我们绝不搞水军控评"，私下部署："今晚通宵安排付费撤稿"',
    "公关口径：「快找关系做有偿删帖」（内部禁止外传）",
    "内部指令“立刻安排水军控评”（禁止截图外泄）",
    "表面禁止硬刚——私下找渠道做有偿删帖但不要留痕",
    "连夜安排设计伪造权威检测报告发官微澄清",
  ];
  for (const line of bypasses) {
    assert.ok(violations(line, CRISIS_ARCH_BLACKHAT).length >= 1, `should catch adversarial bypass: ${line}`);
  }
});

test("all 7 brand-architecture pack capabilities (P0-1..2, P1-1..3, P2-1..2) are wired with intact discipline blocks", () => {
  const matrix = read("skills", "mc-brand", "references", "brand-architecture-matrix.md");
  for (const anchor of [
    "增强型描述词",
    "双向溢出与比价隔离",
    "完全隔离式",
    "纯文字弱背书式",
    "要素品牌化（Ingredient Branding）",
    "跨界合作联名",
    "多主体传播秩序隔离表",
  ]) {
    assert.ok(matrix.includes(anchor), `brand-architecture-matrix.md missing "${anchor}"`);
  }

  const brand = read("skills", "mc-brand", "SKILL.md");
  for (const anchor of [
    "references/brand-architecture-matrix.md", // P0-1 hook
    "资产光谱自下而上提炼通道",                 // P1-2 bottom-up spectrum
    "心智灯塔人群",                             // P1-2 lighthouse vs expansion
    "主次二选一",                               // P1-2 primary driver rule
    "双轴相容性校验",                           // P1-1 compatibility
    "人格过载黑化防线",                         // P1-1 overdose guardrail
    "30% 不变量识别骨架",                       // P0-2 invariant skeleton
    "70% 可变量延展槽位",                       // P0-2 variable slots
    "增强型描述词",                             // P0-1 descriptor tier
    "要素品牌化（Ingredient Branding）",        // P0-1 ingredient branding
    "全链路六大触点调性断层扫描",               // P2-1 touchpoint audit
  ]) {
    assert.ok(brand.includes(anchor), `mc-brand/SKILL.md missing "${anchor}"`);
  }

  const aigc = read("skills", "mc-aigc", "SKILL.md");
  for (const anchor of ["variable_slots", "30% 不变量识别骨架", "70% 可变量延展槽位"]) {
    assert.ok(aigc.includes(anchor), `mc-aigc/SKILL.md missing "${anchor}"`);
  }

  const diagnose = read("skills", "mc-diagnose", "SKILL.md");
  for (const anchor of [
    "危机前线四道止血闸门与分级发言收口协议",
    "在投买量与自动化排期熔断",
    "一线触点发言权限锁死矩阵",
    "黄金核查期双轨应答原则",
    "禁止有偿删帖",
    "不得雇佣水军控评",
  ]) {
    assert.ok(diagnose.includes(anchor), `mc-diagnose/SKILL.md missing "${anchor}"`);
  }

  const product = read("skills", "mc-product", "SKILL.md");
  for (const anchor of [
    "全平台同名账号与句柄",
    "首次商业使用证据链留档",
    "增强型描述词",
    "要素品牌（Ingredient Branding）",
  ]) {
    assert.ok(product.includes(anchor), `mc-product/SKILL.md missing "${anchor}"`);
  }

  const review = read("skills", "mc-review", "SKILL.md");
  assert.ok(review.includes("人格过载防线"), 'mc-review/SKILL.md missing "人格过载防线"');

  // Verify discipline blocks remain intact in skills that carry them
  for (const d of ["mc-brand", "mc-aigc", "mc-diagnose", "mc-product", "mc-review"]) {
    const t = read("skills", d, "SKILL.md");
    assert.ok(
      t.includes("<!-- mc-disciplines:start") && t.includes("<!-- mc-disciplines:end -->"),
      `${d}/SKILL.md lost its mc-disciplines block`,
    );
  }
});
