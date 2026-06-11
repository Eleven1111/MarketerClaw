import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, rmSync, mkdtempSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const run = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const FINALIZE = join(ROOT, "scripts", "finalize.mjs");
const SLUG = "test-finalize-fixture";

function makeWorkspace() {
  return mkdtempSync(join(tmpdir(), "mc-test-"));
}

function makeDoc(step) {
  return [
    `# ${step} 产出`,
    "正文内容。",
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `✅ ${step} · 执行完成`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
  ].join("\n");
}

test("concurrent finalize runs do not lose steps in .status.json", async () => {
  const ws = makeWorkspace();
  const steps = ["brand", "storyteller", "insight", "research", "compete", "seo", "geo", "kol"];
  try {
    await Promise.all(
      steps.map((step) => {
        const input = join(ws, `in-${step}.md`);
        writeFileSync(input, makeDoc(step));
        return run(
          "node",
          [FINALIZE, "--slug", SLUG, "--step", step, "--file", `${step}.md`, "--input", input],
          { cwd: ws, env: { ...process.env, MC_WORKSPACE: ws } }
        );
      })
    );
    const status = JSON.parse(
      readFileSync(join(ws, "campaigns", SLUG, ".status.json"), "utf-8")
    );
    for (const step of steps) {
      assert.equal(status.steps[step]?.status, "done", `step "${step}" missing after concurrent writes`);
    }
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
});

test("finalize rejects path traversal via --slug and --file", async () => {
  const ws = makeWorkspace();
  try {
    const input = join(ws, "in.md");
    writeFileSync(input, makeDoc("x"));

    const evil = await run(
      "node",
      [FINALIZE, "--slug", "../../escape", "--step", "x", "--file", "x.md", "--input", input],
      { cwd: ws, env: { ...process.env, MC_WORKSPACE: ws } }
    );
    assert.ok(!existsSync(join(ws, "..", "escape")), "slug traversal escaped campaigns dir");
    assert.ok(evil.stdout.length > 0);

    writeFileSync(input, makeDoc("x"));
    await assert.rejects(
      run(
        "node",
        [FINALIZE, "--slug", SLUG, "--step", "x", "--file", "../../evil.md", "--input", input],
        { cwd: ws, env: { ...process.env, MC_WORKSPACE: ws } }
      ),
      /escapes campaign directory/
    );
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
});

test("finalize prints the LAST delivery card when body contains a template card", async () => {
  const ws = makeWorkspace();
  try {
    const input = join(ws, "in.md");
    const doc = [
      "# 文档",
      "下面是模板示例：",
      "━━━━━",
      "模板卡（不应输出）",
      "━━━━━",
      "正文继续。",
      "━━━━━",
      "✅ 真实交付卡",
      "━━━━━",
      "",
    ].join("\n");
    writeFileSync(input, doc);
    const { stdout } = await run(
      "node",
      [FINALIZE, "--slug", SLUG, "--step", "card", "--file", "card.md", "--input", input],
      { cwd: ws, env: { ...process.env, MC_WORKSPACE: ws } }
    );
    assert.ok(stdout.includes("真实交付卡"));
    assert.ok(!stdout.includes("模板卡"));
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
});

test("MC_WORKSPACE anchors campaigns dir away from script location", async () => {
  const ws = makeWorkspace();
  try {
    const { stdout } = await run(
      "node",
      [join(ROOT, "scripts", "setup.mjs"), "--slug", SLUG, "--skill", "mc-brand", "--step", "1"],
      { cwd: ws, env: { ...process.env, MC_WORKSPACE: ws } }
    );
    assert.equal(stdout.trim(), `campaigns/${SLUG}`);
    assert.ok(existsSync(join(ws, "campaigns", SLUG, ".status.json")));
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
});
