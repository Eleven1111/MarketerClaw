import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  cpSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INSTALL = join(ROOT, "install.sh");
const SKILL_COUNT = readdirSync(join(ROOT, "skills")).filter((d) => d.startsWith("mc-")).length;

let work;
let tarballUrl;

// A local tarball with the same layout as GitHub's codeload archive
// (single top-level directory), so the piped path can be tested offline.
before(() => {
  work = mkdtempSync(join(tmpdir(), "mc-install-"));
  const stage = join(work, "stage", "MarketerClaw-main");
  mkdirSync(stage, { recursive: true });
  for (const entry of ["skills", "scripts", "install.sh"]) {
    cpSync(join(ROOT, entry), join(stage, entry), { recursive: true });
  }
  const tgz = join(work, "mc.tar.gz");
  const r = spawnSync("tar", ["-czf", tgz, "-C", join(work, "stage"), "MarketerClaw-main"]);
  assert.equal(r.status, 0, r.stderr?.toString());
  tarballUrl = `file://${tgz}`;
});

after(() => rmSync(work, { recursive: true, force: true }));

function freshDir(name) {
  const dir = join(work, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// Simulates `curl -fsSL …/install.sh | bash -s -- <args>`: script on stdin.
function runPiped(cwd, home, args = [], env = {}) {
  return spawnSync("bash", ["-s", "--", ...args], {
    cwd,
    input: readFileSync(INSTALL),
    env: { ...process.env, HOME: home, MC_TARBALL_URL: tarballUrl, ...env },
  });
}

function skillsIn(dir) {
  return existsSync(dir) ? readdirSync(dir).filter((d) => d.startsWith("mc-")) : [];
}

test("piped install from an empty directory downloads the source and installs every skill", () => {
  const cwd = freshDir("piped-empty");
  const home = freshDir("home-piped");
  const r = runPiped(cwd, home);
  assert.equal(r.status, 0, r.stderr.toString());
  assert.equal(skillsIn(join(home, ".openclaw", "skills")).length, SKILL_COUNT);
  assert.ok(existsSync(join(home, ".openclaw", "scripts", "finalize.mjs")));
});

test("piped --local upgrade in a workspace with a prior install replaces skills instead of deleting them", () => {
  const ws = freshDir("ws-upgrade");
  const home = freshDir("home-upgrade");
  assert.equal(runPiped(ws, home, ["--local"]).status, 0);
  // Simulate a stale local copy that the upgrade must overwrite.
  writeFileSync(join(ws, "skills", "mc-aigc", "SKILL.md"), "stale");

  const r = runPiped(ws, home, ["--local"]);
  assert.equal(r.status, 0, r.stderr.toString());
  assert.equal(skillsIn(join(ws, "skills")).length, SKILL_COUNT);
  assert.notEqual(readFileSync(join(ws, "skills", "mc-aigc", "SKILL.md"), "utf-8"), "stale");
});

test("./install.sh --local run from a checkout root is a no-op, not a self-deletion", () => {
  const repo = join(work, "repo-copy");
  for (const entry of ["skills", "scripts", "install.sh"]) {
    cpSync(join(ROOT, entry), join(repo, entry), { recursive: true });
  }
  const r = spawnSync("bash", [join(repo, "install.sh"), "--local"], {
    cwd: repo,
    env: { ...process.env, HOME: freshDir("home-self") },
  });
  assert.equal(r.status, 0, r.stderr.toString());
  assert.match(r.stdout.toString(), /already installed in place/);
  assert.equal(skillsIn(join(repo, "skills")).length, SKILL_COUNT);
});

test("skill names that are not mc-<name> are rejected before anything is deleted", () => {
  const home = freshDir("home-invalid");
  const target = join(home, "ws");
  mkdirSync(join(target, "skills", "mc-keep"), { recursive: true });
  const r = spawnSync("bash", [INSTALL, target, ".."], {
    env: { ...process.env, HOME: home },
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr.toString(), /Invalid skill name/);
  assert.ok(existsSync(join(target, "skills", "mc-keep")), "existing install was touched");
});

test("a failed download exits non-zero with a clear message", () => {
  const r = runPiped(freshDir("piped-fail"), freshDir("home-fail"), [], {
    MC_TARBALL_URL: `file://${join(work, "does-not-exist.tar.gz")}`,
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr.toString(), /Download failed/);
});
