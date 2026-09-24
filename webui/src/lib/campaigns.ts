import fs from "fs";
import path from "path";
import type {
  CampaignMeta,
  CampaignDetail,
  CampaignFile,
  StepStatus,
  AgentStatus,
  Tier,
} from "./types";
import { WORKFLOW_STEPS } from "./types";

// Same anchoring as scripts/lib.mjs: MC_WORKSPACE wins, otherwise the repo
// root next to webui/ (the legacy local-repo layout).
const CAMPAIGNS_DIR = process.env.MC_WORKSPACE
  ? path.resolve(process.env.MC_WORKSPACE, "campaigns")
  : path.resolve(process.cwd(), "..", "campaigns");

const STEP_STATUSES: StepStatus[] = ["done", "running", "pending", "error"];
const TIER_RANK: Record<Tier, number> = { A: 1, B: 2, C: 3 };

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** True if `target` is `base` itself or strictly inside it. */
function isInside(base: string, target: string): boolean {
  const rel = path.relative(base, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/** Resolve a campaign directory; null for slugs that escape campaigns/. */
function campaignDirFor(slug: string): string | null {
  const dir = path.resolve(CAMPAIGNS_DIR, slug);
  return dir !== CAMPAIGNS_DIR && isInside(CAMPAIGNS_DIR, dir) ? dir : null;
}

/**
 * .status.json stores each step as an object written by setup/finalize
 * ({ status: "done", completedAt, file }); older files may hold a bare string.
 */
function toStepStatus(value: unknown): StepStatus | null {
  const raw = typeof value === "string" ? value : (value as { status?: unknown } | null)?.status;
  return STEP_STATUSES.includes(raw as StepStatus) ? (raw as StepStatus) : null;
}

function readStatusFile(campaignDir: string): { steps: Record<string, unknown>; tier: Tier | null } {
  const statusPath = path.join(campaignDir, ".status.json");
  if (!fs.existsSync(statusPath)) return { steps: {}, tier: null };
  try {
    const parsed = JSON.parse(fs.readFileSync(statusPath, "utf-8"));
    const tier = parsed.tier in TIER_RANK ? (parsed.tier as Tier) : null;
    return { steps: parsed.steps ?? {}, tier };
  } catch {
    return { steps: {}, tier: null }; // ignore malformed
  }
}

function fileStatus(campaignDir: string, file: string): StepStatus {
  const target = path.join(campaignDir, file);
  if (file.endsWith("/")) {
    // Directory step (content/) — done if dir exists and has files
    return fs.existsSync(target) &&
      fs.readdirSync(target).filter((f) => f.endsWith(".md")).length > 0
      ? "done"
      : "pending";
  }
  return fs.existsSync(target) ? "done" : "pending";
}

/**
 * Map a campaign directory to step statuses. Which steps are listed depends on
 * the run: an orchestrate campaign shows the steps of its tier (A ⊂ B ⊂ C), a
 * manual mc-campaign run shows brief → strategy → content → channel → review.
 * Any step that already has a status or an output file is always listed.
 */
function resolveSteps(campaignDir: string): Record<string, StepStatus> {
  const { steps: runtime, tier } = readStatusFile(campaignDir);
  const steps: Record<string, StepStatus> = {};

  for (const step of WORKFLOW_STEPS) {
    const status = toStepStatus(runtime[step.id]) ?? fileStatus(campaignDir, step.file);
    const inPlan = tier
      ? step.tier !== null && TIER_RANK[step.tier] <= TIER_RANK[tier]
      : Boolean(step.manual);
    if (inPlan || status !== "pending") {
      steps[step.id] = status;
    }
  }

  return steps;
}

/** Detect platforms from content directory file names. */
function detectPlatforms(campaignDir: string): string[] {
  const contentDir = path.join(campaignDir, "content");
  if (!fs.existsSync(contentDir)) return [];
  return fs
    .readdirSync(contentDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(".md", ""));
}

/** Get the most recent mtime among all files in a directory. */
function latestMtime(dir: string): Date {
  let latest = new Date(0);
  if (!fs.existsSync(dir)) return latest;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = latestMtime(full);
      if (sub > latest) latest = sub;
    } else {
      const stat = fs.statSync(full);
      if (stat.mtime > latest) latest = stat.mtime;
    }
  }
  return latest;
}

// ── Public API ──

export function listCampaigns(): CampaignMeta[] {
  ensureDir(CAMPAIGNS_DIR);

  const dirs = fs
    .readdirSync(CAMPAIGNS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."));

  return dirs
    .map((d) => {
      const dir = path.join(CAMPAIGNS_DIR, d.name);
      const steps = resolveSteps(dir);
      return {
        slug: d.name,
        name: d.name,
        updatedAt: latestMtime(dir).toISOString(),
        steps,
        platforms: detectPlatforms(dir),
      } satisfies CampaignMeta;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getCampaign(slug: string): CampaignDetail | null {
  const dir = campaignDirFor(slug);
  if (!dir || !fs.existsSync(dir)) return null;

  const steps = resolveSteps(dir);
  const files: CampaignFile[] = [];

  // Collect all markdown files and map to steps
  function collect(base: string, rel: string) {
    for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
      const full = path.join(base, entry.name);
      const relPath = path.join(rel, entry.name);
      if (entry.isDirectory()) {
        collect(full, relPath);
      } else if (entry.name.endsWith(".md")) {
        const stat = fs.statSync(full);
        const stepId = matchStep(relPath);
        files.push({
          name: entry.name,
          path: relPath,
          stepId,
          size: stat.size,
          updatedAt: stat.mtime.toISOString(),
        });
      }
    }
  }

  collect(dir, "");

  return {
    slug,
    name: slug,
    updatedAt: latestMtime(dir).toISOString(),
    steps,
    platforms: detectPlatforms(dir),
    files,
  };
}

export function readCampaignFile(slug: string, filePath: string): string | null {
  const dir = campaignDirFor(slug);
  if (!dir) return null;
  const full = path.resolve(dir, filePath);
  // Prevent directory traversal (a plain prefix check would also accept
  // sibling directories such as campaigns-private/)
  if (full === dir || !isInside(dir, full)) return null;
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf-8");
}

export function getAgentStatus(slug?: string): AgentStatus {
  if (slug) {
    const dir = campaignDirFor(slug);
    const statusPath = dir ? path.join(dir, ".status.json") : null;
    if (statusPath && fs.existsSync(statusPath)) {
      try {
        return JSON.parse(fs.readFileSync(statusPath, "utf-8"));
      } catch { /* fallthrough */ }
    }
  }

  return {
    campaignSlug: slug ?? null,
    currentSkill: null,
    currentStep: null,
    status: "idle",
    log: [],
  };
}

/** Match a relative file path to its workflow step id. */
function matchStep(relPath: string): string {
  for (const step of WORKFLOW_STEPS) {
    if (step.file.endsWith("/")) {
      if (relPath.startsWith(step.file) || relPath.startsWith(step.file.slice(0, -1))) {
        return step.id;
      }
    } else if (relPath === step.file) {
      return step.id;
    }
  }
  return "other";
}
