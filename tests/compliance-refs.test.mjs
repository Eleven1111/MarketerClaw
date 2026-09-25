import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkReference,
  unlistedReferences,
  referenceFiles,
  MAX_AGE_DAYS,
} from "../scripts/check-compliance-refs.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REF_DIR = join(ROOT, "skills", "mc-review", "references");

const VALID = [
  "# 规则",
  "",
  "> last_verified: 2026-09-25",
  "",
  "| 检查项 | 说明 | 依据 |",
  "|------|------|------|",
  "| 绝对化用语 | 禁用最高级 | 广告法第九条 [1] |",
  "| 数据出处 | 须标明出处 | 广告法第十一条 [1][2] |",
  "",
  "## 来源",
  "",
  "[1] 广告法 — https://example.gov/ad-law",
  "[2] 解读 — https://example.gov/guide",
].join("\n");

test("every real reference file passes the structure check", () => {
  const files = referenceFiles();
  assert.ok(files.length >= 8, `expected >= 8 reference files, found ${files.length}`);
  for (const f of files) {
    const text = readFileSync(join(REF_DIR, f), "utf-8");
    const { errors } = checkReference(text);
    assert.deepEqual(errors, [], `${f}:\n${errors.join("\n")}`);
    const cited = text.match(/\[\d+\]/g) ?? [];
    assert.ok(cited.length >= 5, `${f}: only ${cited.length} citations — rules without sources?`);
  }
});

test("mc-review's load table lists every reference file", () => {
  const skill = readFileSync(join(ROOT, "skills", "mc-review", "SKILL.md"), "utf-8");
  assert.deepEqual(unlistedReferences(skill, referenceFiles()), []);
  assert.deepEqual(unlistedReferences("references/a.md", ["a.md", "b.md"]), ["b.md"]);
});

test("a well-formed file passes; header and separator rows are not data rows", () => {
  assert.deepEqual(checkReference(VALID).errors, []);
});

test("each structural defect is reported", () => {
  const cases = [
    [VALID.replace("> last_verified: 2026-09-25", ""), /last_verified/],
    [VALID.replace("广告法第九条 [1]", "广告法第九条"), /table row without a \[n\] source/],
    [VALID.replace("[1][2]", "[1][3]"), /\[3\] is cited but not defined/],
    [VALID.replace("广告法第十一条 [1][2]", "广告法第十一条 [1]"), /source \[2\] is defined but never cited/],
    [VALID.replace("— https://example.gov/guide", "— 某报道"), /source \[2\] has no http\(s\) URL/],
    [VALID.replace("## 来源", "## 参考"), /missing "## 来源" section/],
  ];
  for (const [text, expected] of cases) {
    const { errors } = checkReference(text);
    assert.ok(errors.some((e) => expected.test(e)), `expected ${expected}, got:\n${errors.join("\n")}`);
  }
});

test("freshness: within the window passes, beyond it fails, future dates fail", () => {
  const fresh = checkReference(VALID, { freshness: true, today: "2027-03-24" });
  assert.deepEqual(fresh.errors, []);
  assert.equal(fresh.ageDays, MAX_AGE_DAYS);

  const stale = checkReference(VALID, { freshness: true, today: "2027-03-25" });
  assert.ok(stale.errors.some((e) => /days old/.test(e)));

  // Local date vs UTC may differ by a day; that must not fail CI.
  assert.deepEqual(checkReference(VALID, { freshness: true, today: "2026-09-24" }).errors, []);

  const future = checkReference(VALID.replace("2026-09-25", "2062-09-25"), { freshness: true, today: "2026-09-25" });
  assert.ok(future.errors.some((e) => /in the future/.test(e)));
});

test("freshness is not evaluated unless asked", () => {
  assert.deepEqual(checkReference(VALID, { today: "2030-01-01" }).errors, []);
});
