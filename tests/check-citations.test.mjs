import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCitations } from "../scripts/check-citations.mjs";

test("flags hard numbers without source markers", () => {
  const doc = [
    "## 行业概览",
    "该品类市场规模 120 亿元，近三年增速 15%。",
  ].join("\n");
  const warnings = checkCitations(doc);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].line, 2);
});

test("passes numbers covered by citation / inference / assumption markers", () => {
  const doc = [
    "搜索热度上涨 47%[1]",
    "月销约 3 万单 [推断，基于可比品类]",
    "⚠️ 预算 20 万为行业基线假设",
    "这是估算值：约 5 亿元",
  ].join("\n");
  assert.equal(checkCitations(doc).length, 0);
});

test("skips code fences, table separators, templates and quotes", () => {
  const doc = [
    "```",
    "增速 15% 无标注但在代码块里",
    "```",
    "|------|-----|",
    "| 规模 | {估算值} |",
    "> 示例：上涨 47% 的引用例子",
  ].join("\n");
  assert.equal(checkCitations(doc).length, 0);
});
