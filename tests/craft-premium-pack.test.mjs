import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { violations, BANNED } from "./producer-compliance.test.mjs";

// Guards for the physical-craft / subculture-sourcing pack: size caps, no orphan
// or dangling reference files, no black-hat e-commerce advice in any producer
// skill or reference, and the compliance table carrying the matching checks.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(ROOT, "skills");

// Same convention as producer-compliance: a prohibition line is a counter-example.
export const CRAFT_BLACKHAT = [
  { re: /(手工|手作|定制)[^\n]{0,12}(不退不换|不退换|不支持[七7][日天])/, why: "mass-produced goods + handwritten card cannot waive the 7-day return (消费者权益保护法第二十五条)" },
  { re: /运费[^\n]{0,8}999/, why: "inflated-shipping trick to dodge price comparison" },
  { re: /装\s*(淘宝)?小二/, why: "impersonating platform staff" },
  { re: /偷[^\n]{0,4}(评价图|买家图|买家秀)/, why: "stealing buyer photos (著作权法第五十二条)" },
  { re: /伪装[^\n]{0,6}海外直邮/, why: "faked origin / overseas direct mail (广告法第二十八条)" },
];

const ALL_BANNED = [...BANNED, ...CRAFT_BLACKHAT];

// Pre-existing on origin/main before this pack (883 lines); frozen, may not grow.
const LEGACY_OVERSIZE = { "mc-analytics": 883 };

const mcDirs = () => readdirSync(SKILLS).filter((d) => d.startsWith("mc-"));
const read = (...p) => readFileSync(join(ROOT, ...p), "utf-8");
const lineCount = (t) => t.split("\n").length - (t.endsWith("\n") ? 1 : 0);

function referencedMd(skillText) {
  return [...skillText.matchAll(/references\/([\w.-]+\.md)/g)].map((m) => m[1]);
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

test("every skills/mc-*/SKILL.md stays under 800 lines", () => {
  const dirs = mcDirs();
  assert.ok(dirs.length >= 25, `expected >= 25 skills, found ${dirs.length}`);
  for (const d of dirs) {
    const n = lineCount(read("skills", d, "SKILL.md"));
    const cap = LEGACY_OVERSIZE[d] ?? 799;
    assert.ok(n <= cap, `${d}/SKILL.md has ${n} lines (cap ${cap})`);
  }
});

test("reference files are wired both ways (no dangling pointer, no orphan)", () => {
  for (const skill of ["mc-product", "mc-selection"]) {
    const text = read("skills", skill, "SKILL.md");
    const refDir = join(SKILLS, skill, "references");
    const mentioned = new Set(referencedMd(text));
    assert.ok(mentioned.size >= 1, `${skill}/SKILL.md must point at its reference file`);
    for (const f of mentioned) assert.ok(existsSync(join(refDir, f)), `${skill} points at missing references/${f}`);
    for (const f of readdirSync(refDir).filter((x) => x.endsWith(".md"))) {
      assert.ok(mentioned.has(f), `orphan reference: ${skill}/references/${f}`);
    }
  }
  assert.ok(statSync(join(SKILLS, "mc-product/references/physical-craft-premium.md")).isFile());
  assert.ok(statSync(join(SKILLS, "mc-selection/references/subculture-sourcing.md")).isFile());
});

test("no non-review skill or reference teaches a blocked practice", () => {
  const docs = nonReviewDocs();
  assert.ok(docs.some(([n]) => n.endsWith("physical-craft-premium.md")), "craft reference not scanned");
  assert.ok(docs.some(([n]) => n.endsWith("subculture-sourcing.md")), "sourcing reference not scanned");
  const found = docs.flatMap(([name, text]) => violations(text, ALL_BANNED).map((v) => `${name} ${v}`));
  assert.deepEqual(found, []);
});

test("scanner: advice fails, prohibitions pass", () => {
  const bad = [
    "做成手工品不退不换，减少售后",
    "手工定制商品一经售出概不退不换",
    "定制款售出后概不退换",
    "把运费加到999，避开比价",
    "客服可以装淘宝小二跟买家沟通",
    "去同行详情页偷评价图放到自己页面",
    "包装上伪装海外直邮增加溢价",
  ];
  for (const line of bad) assert.equal(violations(line, CRAFT_BLACKHAT).length, 1, `should flag: ${line}`);
  const good = [
    "禁止把手工品不退不换写进详情页",
    "不得将运费设为999来规避比价",
    "不要装淘宝小二",
    "不得偷评价图",
    "禁止写定制款售出后概不退换",
    "不能伪装海外直邮",
  ];
  for (const line of good) assert.equal(violations(line, CRAFT_BLACKHAT).length, 0, `should pass: ${line}`);
});

test("compliance-cn carries the return-right and IP/false-origin checks", () => {
  const t = read("skills", "mc-review", "references", "compliance-cn.md");
  const rows = t.split("\n").filter((l) => l.trim().startsWith("|"));
  const ret = rows.find((l) => l.includes("不退不换"));
  assert.ok(ret, "missing 定制/手工不退不换 row");
  assert.ok(ret.includes("第二十五条") && ret.includes("第二十六条") && /\[14\]/.test(ret));
  const ip = rows.find((l) => l.includes("盗用 IP") || l.includes("盗用IP"));
  assert.ok(ip, "missing 虚构产地/资质联名与盗用 IP 符号 row");
  assert.ok(ip.includes("第二十八条") && ip.includes("第二十三条") && ip.includes("第五十二条"));
  assert.ok(/\[1\]/.test(ip) && /\[15\]/.test(ip));
  for (const n of [14, 15]) {
    assert.match(t, new RegExp(`^\\[${n}\\].*https://[\\w.]*gov\\.cn/\\S*`, "m"), `source [${n}] must be a gov.cn-domain URL`);
  }
});
