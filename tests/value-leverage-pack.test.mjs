import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Standalone guard suite for the value-leverage pack:
// 1. Line caps on all skills/mc-*/SKILL.md (<= 799; mc-analytics frozen at 883)
// 2. Zero external attribution & zero-width character check across skills/ and templates/
// 3. Black-hat e-commerce & growth advice scanner (LEAN_BLACKHAT) + unit tests
// 4. Shard B structural landing checks (product, storyteller, copy, livestream, community, retain)

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(ROOT, "skills");
const TEMPLATES = join(ROOT, "templates");

const LEGACY_OVERSIZE = { "mc-analytics": 883 };

const NEGATION = /不得|不要|不能|禁止|不写|❌/;
const SPEECH_G = /[：:]\**\s*["“]([^"”]*)["”]/g;
const CLAUSE_SPLIT = /[|，,；;。！？]+/;

export const LEAN_BLACKHAT = [
  { re: /刷单/, why: "fake orders / brushing (反不正当竞争法第八条、网络反不正当竞争暂行规定第九条)" },
  { re: /空包/, why: "empty-parcel brushing logistics fraud" },
  { re: /流量精灵/, why: "bot traffic software fraud" },
  { re: /全网劫持/, why: "cross-platform traffic hijacking / malware injection" },
  { re: /短信轰炸/, why: "non-consensual SMS bombing (消费者权益保护法第二十九条)" },
  { re: /职业差评/, why: "malicious negative-review extortion" },
  { re: /合体红包/, why: "WeChat external-link viral red-packet inducement" },
  { re: /三级分销/, why: "multi-level pyramid distribution (禁止传销条例第七条)" },
  { re: /掺水/, why: "adulteration / covertly downgrading batch specs (产品质量法第三十二条)" },
  { re: /买通讯录/, why: "illegally purchasing personal contact lists (个人信息保护法第十条)" },
  { re: /撞库/, why: "credential stuffing / illegal data matching" },
];

function isExcused(scope, unless) {
  return NEGATION.test(scope) || Boolean(unless && unless.test(scope));
}

export function violations(text, banned = LEAN_BLACKHAT) {
  const found = [];
  text.split("\n").forEach((line, i) => {
    const speeches = [...line.matchAll(SPEECH_G)].map((m) => m[1]);
    const clauses = line.split(CLAUSE_SPLIT);
    for (const { re, unless, why } of banned) {
      if (!re.test(line)) continue;
      const matchingSpeeches = speeches.filter((s) => re.test(s));
      if (matchingSpeeches.length > 0) {
        if (matchingSpeeches.every((s) => isExcused(s, unless))) continue;
      } else {
        const matchingClauses = clauses.filter((c) => re.test(c));
        const scopes = matchingClauses.length > 0 ? matchingClauses : [line];
        if (scopes.every((s) => isExcused(s, unless))) continue;
      }
      found.push(`L${i + 1}: ${line.trim().slice(0, 70)} — ${why}`);
    }
  });
  return found;
}

const mcDirs = () => readdirSync(SKILLS).filter((d) => d.startsWith("mc-"));
const read = (...p) => readFileSync(join(ROOT, ...p), "utf-8");
const lineCount = (t) => t.split("\n").length - (t.endsWith("\n") ? 1 : 0);

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

test("every skills/mc-*/SKILL.md stays within the 799-line cap (mc-analytics legacy 883)", () => {
  const dirs = mcDirs();
  assert.ok(dirs.length >= 25, `expected >= 25 skills, found ${dirs.length}`);
  for (const d of dirs) {
    const n = lineCount(read("skills", d, "SKILL.md"));
    const cap = LEGACY_OVERSIZE[d] ?? 799;
    assert.ok(n <= cap, `${d}/SKILL.md has ${n} lines (cap ${cap})`);
  }
});

test("zero external attribution or zero-width chars in skills/ and templates/", () => {
  const ATTR_RE = /穷营销|波旬|他化自在天|兔博士|万表网/;
  const ZW_RE = /[\u200B-\u200D\u2060\uFEFF]/;
  const allMd = [
    ...walkMdFiles(SKILLS, "skills"),
    ...walkMdFiles(TEMPLATES, "templates"),
  ];
  assert.ok(allMd.length >= 30, `expected >= 30 markdown files, found ${allMd.length}`);
  const badAttr = [];
  const badZw = [];
  for (const [rel, text] of allMd) {
    const mAttr = text.match(ATTR_RE);
    if (mAttr) badAttr.push(`${rel}: found "${mAttr[0]}"`);
    if (ZW_RE.test(text)) badZw.push(`${rel}: contains zero-width character`);
  }
  assert.deepEqual(badAttr, []);
  assert.deepEqual(badZw, []);
});

test("no non-review skill or reference teaches a LEAN_BLACKHAT practice", () => {
  const docs = nonReviewDocs();
  assert.ok(docs.length >= 25, `expected >= 25 producer docs, found ${docs.length}`);
  const found = docs.flatMap(([name, text]) =>
    violations(text, LEAN_BLACKHAT).map((v) => `${name} ${v}`),
  );
  assert.deepEqual(found, []);
});

test("LEAN_BLACKHAT scanner: positive advice fails, prohibitions pass, quoted speech with trailing note fails", () => {
  const adviceLines = [
    "新品上架前三天先找老客刷单把基础销量做起来",
    "发空包冲物流揽收率",
    "用流量精灵把店铺假UV刷上去",
    "投全网劫持广告代码截流同行访客",
    "大促前夜给沉睡名单来一轮短信轰炸",
    "雇职业差评师去盯对家的爆款链接",
    "在微信群发合体红包要求转发三个群才能提现",
    "设计三级分销抽佣体系让全员帮你拉人头",
    "第二批大货暗中掺水把成本压下来",
    "找渠道商买通讯录直接导入企微加人",
    "用撞库工具扫一批高净值电商买家手机号",
  ];
  assert.equal(adviceLines.length, LEAN_BLACKHAT.length);
  for (const line of adviceLines) {
    assert.equal(violations(line, LEAN_BLACKHAT).length, 1, `should flag advice: ${line}`);
  }

  const prohibitionLines = [
    "禁止刷单或虚构交易记录",
    "不得发空包伪造物流信息",
    "严禁并禁止使用流量精灵等作弊软件",
    "不得采购全网劫持等灰黑产流量",
    "禁止对用户进行短信轰炸",
    "不得雇佣职业差评人员恶意打击竞品",
    "禁止使用合体红包等诱导分享手段",
    "不得设计三级分销或多级拉人头返佣",
    "不得在量产批次暗降规格掺水或以次充好",
    "禁止买通讯录或非法买卖个人信息",
    "不得使用撞库手段获取用户账号数据",
  ];
  for (const line of prohibitionLines) {
    assert.equal(violations(line, LEAN_BLACKHAT).length, 0, `should allow prohibition: ${line}`);
  }

  const quotedSpeechWithTrailingCaveat = [
    '· 裂变话术："转发合体红包到三个群立刻领现金"（禁止违规诱导）',
    '· 运营动作："先刷单把前二十条评价铺满"（不得被平台抓到）',
    "禁止刷单冲销量，但可以用流量精灵把收藏加购率做高",
    '对比话术：“正品足量不虚标” vs 违规话术：“第二批暗中掺水降成本”（禁止采用）',
    "| 违规禁区 | 禁止刷单 | 建议改用短信轰炸唤醒老客 |",
  ];
  for (const line of quotedSpeechWithTrailingCaveat) {
    assert.ok(
      violations(line, LEAN_BLACKHAT).length >= 1,
      `adversarial bypass line must be flagged: ${line}`,
    );
  }
});

test("Shard B skills preserve disciplines block and carry required capability upgrades", () => {
  const expected = {
    "mc-product": [
      "品类量化立规",
      "木马钩子",
      "社交借口",
      "references/physical-craft-premium.md",
    ],
    "mc-storyteller": ["社交借口"],
    "mc-copy": ["盗雷"],
    "mc-livestream": [
      "劝退",
      "盗雷",
      "话术红线",
      "直播电商监督管理办法",
      "前 7 日内最低成交价",
    ],
    "mc-community": [
      "先跟后带",
      "平台导流红线",
      "交易导流违规管理细则",
      "不得以好评",
    ],
    "mc-retain": [
      "赠品工程四维",
      "F 维",
      "多巴胺不应期",
      "微惊喜权",
      "15%",
    ],
  };

  for (const [skill, markers] of Object.entries(expected)) {
    const text = read("skills", skill, "SKILL.md");
    assert.ok(
      text.includes("<!-- mc-disciplines:start"),
      `${skill}/SKILL.md missing mc-disciplines:start`,
    );
    assert.ok(
      text.includes("<!-- mc-disciplines:end -->"),
      `${skill}/SKILL.md missing mc-disciplines:end`,
    );
    for (const marker of markers) {
      assert.ok(
        text.includes(marker),
        `${skill}/SKILL.md missing required marker "${marker}"`,
      );
    }
  }
});
