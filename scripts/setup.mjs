#!/usr/bin/env node
/**
 * setup.mjs — Campaign initializer
 *
 * Usage:
 *   node scripts/setup.mjs --slug <slug> [--skill <skill>] [--step <step>]
 *
 * Creates campaigns/{slug}/ and writes an initial .status.json.
 * Outputs the campaign directory path to stdout.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CAMPAIGNS_DIR = resolve(__dirname, "..", "campaigns");

// ── Arg parsing ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] ?? null : null;
};

let slug = get("--slug");
const skill = get("--skill");
const step = get("--step");

if (!slug) {
  // Auto-generate slug from timestamp + skill
  const ts = new Date().toISOString().slice(0, 10);
  slug = `${skill ?? "campaign"}-${ts}`;
  process.stderr.write(`[setup] No --slug provided, using: ${slug}\n`);
}

// Sanitize slug: lowercase, replace spaces with hyphens, strip unsafe chars
slug = slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-_]/g, "");

// ── Create campaign directory ─────────────────────────────────────────────────

const campaignDir = join(CAMPAIGNS_DIR, slug);
mkdirSync(campaignDir, { recursive: true });
mkdirSync(join(campaignDir, "content"), { recursive: true });

// ── Read or init .status.json ─────────────────────────────────────────────────

const statusPath = join(campaignDir, ".status.json");
let status = {};

if (existsSync(statusPath)) {
  try {
    status = JSON.parse(readFileSync(statusPath, "utf-8"));
  } catch {
    // Corrupt status file — reset
  }
}

const now = new Date().toISOString();

status = {
  ...status,
  campaignSlug: slug,
  currentSkill: skill ?? status.currentSkill ?? null,
  currentStep: step ?? status.currentStep ?? null,
  status: "running",
  startedAt: status.startedAt ?? now,
  updatedAt: now,
  steps: status.steps ?? {},
  log: status.log ?? [],
  review_loop: status.review_loop ?? { iteration: 0, max: 3, last_verdict: null, blocked_files: [] },
};

if (step && !status.steps[step]) {
  status.steps[step] = { status: "running", startedAt: now };
}

status.log.push({
  time: now,
  level: "info",
  message: `▶ ${skill ?? "campaign"} · ${step ?? "init"}`,
});

// Keep log bounded
if (status.log.length > 200) {
  status.log = status.log.slice(-200);
}

writeFileSync(statusPath, JSON.stringify(status, null, 2), "utf-8");

// ── Output ────────────────────────────────────────────────────────────────────

process.stdout.write(`campaigns/${slug}\n`);
