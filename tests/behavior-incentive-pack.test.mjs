import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Standalone guard suite for the behavior-stage incentive matching & demand-window pack:
// 1. Line caps: skills/mc-*/SKILL.md <= 799 (mc-analytics frozen 883), mc-dtc <= 786, SSOT ref 80..399
// 2. Two-way reference wiring in mc-retain + valid cross-skill paths + mc-product safety against bare regex
// 3. Zero external attribution (\u-escaped) & zero-width char check across skills/ and templates/
// 4. Incentive dark-pattern scanner (INCENTIVE_DARK_PATTERNS) + >=18 adversarial probe unit tests
// 5. Structural capability anchors across SSOT & all 8 wired skill modules + intact discipline blocks

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(ROOT, "skills");
const TEMPLATES = join(ROOT, "templates");

const LEGACY_OVERSIZE = { "mc-analytics": 883 };
const SSOT = ["skills", "mc-retain", "references", "behavior-stage-incentives.md"];

// Valid negations only: excludes false-negation substrings 不得已/不得了/不得不/不要怕/不能不/不可避免/求之不得
// and negated prohibitions (并未禁止/没有禁止/不禁止) or pre-term "不写进/不写入"
const NEGATION_G =
  /(?<![求由巴恨迫])(?<!并未)(?<!没有)(?<![不未])不得(?![已了不])|不要(?!怕)|不能(?!不)|(?<!不可)避免|(?<!并未)(?<!没有)(?<![不未])禁止|不写(?!进|入|在|成|明)|❌|(?<![不未])(?:严禁|绝不|切勿|杜绝)|(?<!切)勿/g;
const SPEECH_G = /(?:["“]([^"”]*)["”]|「([^」]*)」|『([^』]*)』)/g;
const CLAUSE_SPLIT = /[|，,；;。！？：:（）()【】\[\]]+|——|--/;
const NB = "[^\\n，,；;。！？|]";

export const INCENTIVE_DARK_PATTERNS = [
  {
    re: new RegExp(`(?:惩罚式|未打卡|断签|不活跃|连续${NB}{0,12}(?:未|不)${NB}{0,8})${NB}{0,6}扣分|扣成长值`),
    why: "punitive point/level deduction harms user self-efficacy and retention",
  },
  {
    re: new RegExp(`(?:虚假|循环(?:重置)?)${NB}{0,6}倒计时|假倒计时`),
    why: "fake or endlessly resetting countdown timers are dark-pattern urgency",
  },
  {
    re: new RegExp(`促成${NB}{0,6}非理性${NB}{0,6}(?:快速)?购买`),
    why: "inducing irrational impulse purchases drives high return rates and refunds",
  },
  {
    re: /羞耻式拒选|Confirmshaming/i,
    why: "confirmshaming opt-out copy manipulates users via guilt/shame",
  },
  {
    re: new RegExp(`(?:[无未](?:提前)?(?:公示|通知)|断签|直接|强制)${NB}{0,8}(?:清零|作废)${NB}{0,8}(?:积分|权益)?`),
    why: "unannounced forfeiture of earned loyalty points or member benefits",
  },
  {
    re: new RegExp(`刻意拉高${NB}{0,6}(?:退订|取消)${NB}{0,6}门槛|(?:隐藏|隐蔽)自动续费|阻[挠碍](?:取消|退订)`),
    why: "dark-pattern cancellation friction or hidden auto-renewal violates consumer rules",
  },
  {
    re: new RegExp(`(?:设置|每日|开启|通过)${NB}{0,6}(?:打卡|签到)|知识分享\\+打卡`),
    why: "stale check-in skin promotion causes point inflation and retention decay",
  },
  {
    re: /(?<!真实|实际)库存紧迫感|首屏强弹窗/,
    why: "unqualified scarcity urgency or first-screen hard popup hurts trust and UX",
  },
];

function isExcused(scope, re) {
  const termMatch = scope.match(re);
  if (!termMatch) return true;
  for (const neg of scope.matchAll(NEGATION_G)) {
    if (neg.index < termMatch.index) return true;
  }
  return false;
}

function lineViolates(line, re) {
  if (!re.test(line)) return false;
  const speeches = [...line.matchAll(SPEECH_G)].map((m) => m[1] ?? m[2] ?? m[3]);
  const outside = line.replace(SPEECH_G, "◇"); // inert token outside CLAUSE_SPLIT
  const dequoted = line.replace(/[「」『』"“”]/g, "");
  const scopes = [
    ...speeches.filter((s) => re.test(s)),
    ...outside.split(CLAUSE_SPLIT).filter((c) => re.test(c)),
    ...dequoted.split(CLAUSE_SPLIT).filter((c) => re.test(c)),
  ];
  if (scopes.length === 0) scopes.push(re.test(outside) ? outside : line);
  return scopes.some((s) => !isExcused(s, re));
}

const stripMdPrefix = (line) => line.replace(/^\s*(?:>+\s*|[-*+]\s+|\d+[.)]\s+)/, "").trim();

export function violations(text, banned = INCENTIVE_DARK_PATTERNS) {
  const found = [];
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    for (const { re, why } of banned) {
      if (lineViolates(line, re)) found.push(`L${i + 1}: ${line.trim().slice(0, 70)} — ${why}`);
      const s0 = stripMdPrefix(line);
      const next1 = lines[i + 1];
      const s1 = next1 === undefined ? "" : stripMdPrefix(next1);
      if (!s0 || !s1 || re.test(line) || re.test(next1)) continue;
      const joined2 = s0 + s1;
      if (lineViolates(joined2, re)) {
        found.push(`L${i + 1}-${i + 2}: ${joined2.slice(0, 70)} — ${why}`);
        continue;
      }
      const next2 = lines[i + 2];
      const s2 = next2 === undefined ? "" : stripMdPrefix(next2);
      if (!s2 || re.test(next2) || re.test(s1 + s2)) continue;
      const joined3 = s0 + s1 + s2;
      if (lineViolates(joined3, re)) found.push(`L${i + 1}-${i + 3}: ${joined3.slice(0, 70)} — ${why}`);
    }
  });
  return found;
}

const mcDirs = () => readdirSync(SKILLS).filter((d) => d.startsWith("mc-"));
const read = (...p) => readFileSync(join(ROOT, ...p), "utf-8");
const lineCount = (t) => t.split("\n").length - (t.endsWith("\n") ? 1 : 0);

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

test("line caps hold across all skills, mc-dtc <= 786, and behavior-stage-incentives.md in 80..399", () => {
  const dirs = mcDirs();
  assert.ok(dirs.length >= 25, `expected >= 25 skills, found ${dirs.length}`);
  for (const d of dirs) {
    const n = lineCount(read("skills", d, "SKILL.md"));
    const cap = LEGACY_OVERSIZE[d] ?? 799;
    assert.ok(n <= cap, `${d}/SKILL.md has ${n} lines (cap ${cap})`);
  }
  const dtcLines = lineCount(read("skills", "mc-dtc", "SKILL.md"));
  assert.ok(dtcLines <= 786, `mc-dtc/SKILL.md has ${dtcLines} lines (hard cap 786)`);

  const ssotLines = lineCount(read(...SSOT));
  assert.ok(ssotLines >= 80 && ssotLines < 400, `behavior-stage-incentives.md has ${ssotLines} lines (expected 80..399)`);
});

test("reference wiring is two-way for mc-retain, cross-skill pointers resolve, and mc-product avoids local regex collision", () => {
  const retain = read("skills", "mc-retain", "SKILL.md");
  const refDir = join(SKILLS, "mc-retain", "references");
  assert.ok(existsSync(refDir), "missing skills/mc-retain/references");
  const localRefs = new Set(localReferencedMd(retain));
  assert.ok(localRefs.has("behavior-stage-incentives.md"), "mc-retain/SKILL.md must wire behavior-stage-incentives.md");
  for (const f of localRefs) {
    assert.ok(existsSync(join(refDir, f)), `mc-retain/SKILL.md points at missing references/${f}`);
  }
  for (const f of readdirSync(refDir).filter((x) => x.endsWith(".md"))) {
    assert.ok(localRefs.has(f), `orphan reference file in mc-retain/references: ${f}`);
  }
  assert.ok(statSync(join(ROOT, ...SSOT)).isFile());

  for (const skill of ["mc-community", "mc-automation", "mc-dtc", "mc-diagnose"]) {
    const t = read("skills", skill, "SKILL.md");
    assert.ok(
      t.includes("skills/mc-retain/references/behavior-stage-incentives.md"),
      `${skill}/SKILL.md missing cross-skill pointer to skills/mc-retain/references/behavior-stage-incentives.md`,
    );
  }

  const product = read("skills", "mc-product", "SKILL.md");
  assert.ok(
    !product.includes("references/behavior-stage-incentives.md"),
    "mc-product/SKILL.md must not include cross-skill references/*.md string (would trip craft-premium-pack bare regex)",
  );
  assert.ok(
    product.includes("mc-retain 的行为阶段激励矩阵"),
    "mc-product/SKILL.md missing descriptive pointer to mc-retain 的行为阶段激励矩阵",
  );
});

test("zero external attribution or zero-width chars across skills/ and templates/", () => {
  // Encoded with \uXXXX escapes so external source/case names never appear in plain text
  const ATTR_RE =
    /\u7f51\u6613\u4e91\u8bfe\u5802|\u7f51\u6613\u5f00\u5e74\u5927\u8bfe|\u7f51\u6613\u676d\u5dde\u7814\u7a76\u9662|\u4efb\u743c\u7476|\u7814\u62a5\u5ba2|\u0079\u0061\u006e\u0062\u0061\u006f\u006b\u0065|\u68ee\u6797\u8fd0\u52a8\u4f1a|\u52a8\u753b\u5fc3\u7597\u7cfb|\u5c0f\u7ed8\u672c\u7d20\u63cf|\u997f\u4e86\u4e48|\u521d\u6765\u5f97\u5230|\u5434\u519b\u7684\u8c37\u6b4c|(?<![A-Za-z])\u004b\u0045\u0045\u0050(?![A-Za-z])/;
  const ZW_RE = /[\u200B-\u200D\u2060\uFEFF]/;
  const allMd = [...walkMdFiles(SKILLS, "skills"), ...walkMdFiles(TEMPLATES, "templates")];
  assert.ok(allMd.length >= 30, `expected >= 30 markdown files, found ${allMd.length}`);
  const bad = [];
  for (const [rel, text] of allMd) {
    const m = text.match(ATTR_RE);
    if (m) bad.push(`${rel}: external attribution match "${m[0]}"`);
    if (ZW_RE.test(text)) bad.push(`${rel}: zero-width char`);
  }
  assert.deepEqual(bad, []);
});

test("no non-review skill or reference teaches an INCENTIVE_DARK_PATTERNS practice", () => {
  const docs = nonReviewDocs();
  assert.ok(
    docs.some(([n]) => n === "mc-retain/references/behavior-stage-incentives.md"),
    "behavior-stage-incentives.md must be scanned",
  );
  const found = docs.flatMap(([name, text]) =>
    violations(text, INCENTIVE_DARK_PATTERNS).map((v) => `${name} ${v}`),
  );
  assert.deepEqual(found, []);
});

test("INCENTIVE_DARK_PATTERNS scanner catches positive advice and 15 adversarial bypasses while passing prohibitions", () => {
  const adviceLines = [
    "如果用户连续 7 天未打卡自动扣分提醒逼单",
    "落地页顶部放一个循环重置倒计时刺激用户马上下单",
    "用限时秒杀促成非理性快速购买提升当天成交",
    "弹窗拒绝按钮写羞耻式拒选文案让用户难堪",
    "每月 1 号直接清零已获积分，不用提前发通知",
    "为防止流失，可在后台刻意拉高退订取消门槛",
    "群里没人说话时，管理员设置每日打卡拉活跃",
    "加购未买可发送社会证明或库存紧迫感催单",
  ];
  assert.equal(adviceLines.length, INCENTIVE_DARK_PATTERNS.length);
  for (const line of adviceLines) {
    assert.equal(violations(line).length, 1, `should flag positive dark-pattern advice: ${line}`);
  }

  const prohibitionLines = [
    "禁止对沉默会员实施未打卡扣分或扣成长值处罚",
    "禁止在活动页使用循环重置倒计时或假倒计时",
    "禁止用虚假稀缺促成非理性快速购买",
    "禁止在弹窗中使用羞耻式拒选或 Confirmshaming 文案",
    "禁止无提前公示清零已获积分或单方缩减权益",
    "禁止在订阅中心刻意拉高退订取消门槛",
    "禁止在社群设置打卡/签到机制刷屏灌水",
    "发送真实库存紧迫感时必须对应实际库存，禁止首屏强弹窗",
  ];
  assert.equal(prohibitionLines.length, INCENTIVE_DARK_PATTERNS.length);
  for (const line of prohibitionLines) {
    assert.equal(violations(line).length, 0, `should pass valid prohibition: ${line}`);
  }

  // Adversarial bypass probes (including R1 P1-P5 and R2 N4-N5)
  const bypasses = [
    "禁止恶意刷单，但可设置连续 5 天不活跃直接扣分",
    "| 禁止虚假宣传 | 可给落地页加循环重置倒计时逼单 |",
    '弹窗按钮："不用了，我甘愿多花冤枉钱"——这是典型羞耻式拒选（切勿抄袭）',
    '规则说明："我们绝不扣成长值"，内部策略："连续未打卡自动扣分"',
    "话术模板：「限时 10 分钟循环重置倒计时」（禁止跨平台外泄）",
    "表面禁止暗箱——后台可刻意拉高退订取消门槛但不要写进公开FAQ",
    "为了留存不得不直接清零积分，用户不要怕未打卡扣分",
    "通过限时秒杀制造紧迫，促成\n非理性快速购买",
    "禁止使用焦虑话术：实操可设置连续未打卡自动扣分",
    "为了拉动复购不可避免地要上循环重置倒计时，求之不得立刻直接清零积分",
    "禁止虚标原价，可用「循环重置」倒计时逼单",
    "通过限时活动促成\n> 非理性\n快速购买",
    "隐藏自动续费并阻挠取消订阅，未提前通知直接作废已攒积分",
    "【禁止外传】活动页可直接上假倒计时逼单",
    "平台并未禁止通过循环重置倒计时促单，不写进规则就能直接清零积分",
  ];
  for (const probe of bypasses) {
    assert.ok(violations(probe).length >= 1, `should catch adversarial bypass: ${probe.replace(/\n/g, "\\n")}`);
  }
});

test("all 6 extracted capabilities are anchored in SSOT and the 8 wired skill modules with intact discipline blocks", () => {
  const ssot = read(...SSOT);
  for (const anchor of [
    "意图分水岭",
    "5 认知杠杆",
    "5 行为杠杆",
    "双向错配红牌表",
    "双行为环强制拆解表",
    "3 分钟微胜利阶梯（Micro-Win Ladder）",
    "无羞耻重启通道（Shame-Free Reset）",
    "均衡决策天平：减 Cons 优先于加 Pros",
    "五步激励规划 SOP",
    "阶段 × 跨端停留轨迹落位表",
    "需求窗口与饱和期静默门禁（需求期 ≠ 触点期）",
    "2026 激励与负向刺激反暗黑模式红线",
  ]) {
    assert.ok(ssot.includes(anchor), `behavior-stage-incentives.md missing "${anchor}"`);
  }

  const requiredAnchors = {
    "mc-retain/SKILL.md": [
      "references/behavior-stage-incentives.md",
      "双行为环拆解与螺旋退行无羞耻重启",
      "3 分钟微胜利阶梯",
      "无羞耻重启通道",
      "禁止惩罚式扣分",
      "基于真实可核验名额与截止时间提供优先感",
      "仅限真实到期日",
    ],
    "mc-community/SKILL.md": [
      "激励设计前五问门禁（防阶段错配）",
      "skills/mc-retain/references/behavior-stage-incentives.md",
      "知识分享+里程碑陪跑",
      "围绕真实使用微胜利发起轻互动接龙与主理人答疑",
      "核心使用/互动里程碑",
      "激励反暗黑模式红线",
    ],
    "mc-automation/SKILL.md": [
      "需求窗口与饱和静默门禁（Suppression Gate）",
      "真实库存紧迫感（仅限实际低库存，禁止虚构稀缺）",
      "用量周期 75%–85% 需求窗",
      "用量周期达 75%–85% 补货需求窗",
      "无羞耻重启入口",
      "需求窗口与饱和期静默门禁（需求期 ≠ 触点期）",
      "skills/mc-retain/references/behavior-stage-incentives.md",
    ],
    "mc-dtc/SKILL.md": [
      "真实限时/限量（如有）",
      "流量行为阶段 × 页面激励落位",
      "首屏 Hero",
      "订单追踪页",
      "skills/mc-retain/references/behavior-stage-incentives.md",
    ],
    "mc-product/SKILL.md": [
      "初次使用「3 分钟微胜利」与习惯槽位嵌入",
      "旧习惯槽位嵌入（对抗性条件反射）",
      "物理环境触发器（刺激控制）",
      "mc-retain 的行为阶段激励矩阵",
    ],
    "mc-diagnose/SKILL.md": [
      "查激励与触达失效四因",
      "激励与触达失效四因排查表",
      "skills/mc-retain/references/behavior-stage-incentives.md",
    ],
    "mc-cmo/SKILL.md": ["无脑堆激励 / 阶段错配拦截"],
    "mc-cmo/frameworks/judgment.md": ["常见需要质疑的场景（无脑堆激励 / 阶段错配）"],
    "mc-review/SKILL.md": ["激励反暗黑模式"],
  };

  for (const [rel, anchors] of Object.entries(requiredAnchors)) {
    const t = read("skills", rel);
    for (const a of anchors) {
      assert.ok(t.includes(a), `${rel} missing anchor "${a}"`);
    }
  }

  for (const d of [
    "mc-retain",
    "mc-community",
    "mc-automation",
    "mc-dtc",
    "mc-product",
    "mc-diagnose",
    "mc-review",
  ]) {
    const t = read("skills", d, "SKILL.md");
    assert.ok(
      t.includes("<!-- mc-disciplines:start") && t.includes("<!-- mc-disciplines:end -->"),
      `${d}/SKILL.md lost its mc-disciplines block`,
    );
  }
});
