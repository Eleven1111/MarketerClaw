/**
 * lib.mjs — Shared helpers for setup.mjs / finalize.mjs
 *
 * - sanitizeSlug:        single source of truth for slug normalization
 * - resolveCampaignsDir: workspace-anchored campaigns/ resolution
 * - mutateStatus:        transactional read-modify-write of .status.json
 *                        guarded by a lock directory (parallel batches in
 *                        mc-orchestrate run several finalize processes at once)
 */

import {
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  rmdirSync,
  statSync,
  existsSync,
} from "fs";
import { resolve, join, dirname } from "path";

export function sanitizeSlug(slug) {
  return String(slug)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_一-鿿]/g, "");
}

/**
 * Resolution order:
 *   1. MC_WORKSPACE env var (explicit override)
 *   2. cwd, if it already contains a campaigns/ dir (normal workspace run)
 *   3. script-relative ../campaigns, if it exists (legacy local-repo layout)
 *   4. cwd (fresh workspace — campaigns/ will be created here)
 */
export function resolveCampaignsDir(scriptDir) {
  if (process.env.MC_WORKSPACE) {
    return resolve(process.env.MC_WORKSPACE, "campaigns");
  }
  const cwdCampaigns = resolve(process.cwd(), "campaigns");
  if (existsSync(cwdCampaigns)) return cwdCampaigns;

  const scriptCampaigns = resolve(scriptDir, "..", "campaigns");
  if (existsSync(scriptCampaigns)) return scriptCampaigns;

  return cwdCampaigns;
}

const LOCK_STALE_MS = 30_000;
const LOCK_TIMEOUT_MS = 10_000;
const LOCK_RETRY_MS = 50;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function acquireLock(lockPath) {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  for (;;) {
    try {
      mkdirSync(lockPath);
      return;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      try {
        if (Date.now() - statSync(lockPath).mtimeMs > LOCK_STALE_MS) {
          rmdirSync(lockPath);
          continue;
        }
      } catch {
        continue; // lock vanished between checks — retry immediately
      }
      if (Date.now() > deadline) {
        throw new Error(`timed out waiting for status lock: ${lockPath}`);
      }
      await sleep(LOCK_RETRY_MS);
    }
  }
}

function releaseLock(lockPath) {
  try {
    rmdirSync(lockPath);
  } catch {
    // Non-fatal: stale-lock reclaim will clean up
  }
}

/**
 * Transactionally mutate campaigns/{slug}/.status.json.
 * `mutator(status)` receives the freshly-read status object and must return
 * the object to persist. Write is atomic (temp file + rename).
 */
export async function mutateStatus(campaignDir, mutator) {
  const statusPath = join(campaignDir, ".status.json");
  const lockPath = statusPath + ".lock";

  await acquireLock(lockPath);
  try {
    let status = {};
    if (existsSync(statusPath)) {
      try {
        status = JSON.parse(readFileSync(statusPath, "utf-8"));
      } catch {
        // Corrupt status file — reset
      }
    }
    status = mutator(status) ?? status;
    const tmpPath = statusPath + `.tmp-${process.pid}`;
    mkdirSync(dirname(statusPath), { recursive: true });
    writeFileSync(tmpPath, JSON.stringify(status, null, 2), "utf-8");
    renameSync(tmpPath, statusPath);
    return status;
  } finally {
    releaseLock(lockPath);
  }
}
