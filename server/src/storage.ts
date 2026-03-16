import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  CreateWorkflowRequest,
  StoredWorkflowRecord,
  WorkflowListItem,
  WorkflowRun
} from "./types.js";

function resolveWorkflowDataDir(projectRoot: string): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "marketerclaw", "runs");
  }
  return path.join(projectRoot, "server", "data", "workflows");
}

function workflowFilePath(projectRoot: string, workflowId: string): string {
  return path.join(resolveWorkflowDataDir(projectRoot), `${workflowId}.json`);
}

function toWorkflowListItem(run: WorkflowRun): WorkflowListItem {
  return {
    id: run.id,
    createdAt: run.createdAt,
    rerunOf: run.rerunOf,
    rerunMode: run.rerunContext.mode,
    projectName: run.campaign.projectName,
    templateName: run.templateName,
    primaryPlatform: run.campaign.primaryPlatform,
    readinessScore: run.review.readinessScore,
    riskLevel: run.review.riskLevel,
    gateBlockers: run.board.gateBlockers,
    outputCount: run.board.outputCount,
    launchReady: run.approval.launchReady
  };
}

function extractRun(parsed: unknown): WorkflowRun | null {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  if ("run" in parsed && parsed.run && typeof parsed.run === "object") {
    return parsed.run as WorkflowRun;
  }

  if ("campaign" in parsed && "templateName" in parsed && "review" in parsed) {
    return parsed as WorkflowRun;
  }

  return null;
}

function sanitizeWorkflowRequest(request: CreateWorkflowRequest): CreateWorkflowRequest {
  return {
    ...request,
    roles: request.roles.map((role) => ({
      ...role,
      model: {
        ...role.model,
        apiKey: ""
      }
    }))
  };
}

function sanitizeWorkflowRecord(record: StoredWorkflowRecord): StoredWorkflowRecord {
  return {
    ...record,
    request: sanitizeWorkflowRequest(record.request)
  };
}

function requestContainsPlaintextSecrets(request: CreateWorkflowRequest): boolean {
  return request.roles.some((role) => Boolean(role.model.apiKey.trim()));
}

export async function persistWorkflowRecord(
  projectRoot: string,
  record: StoredWorkflowRecord
): Promise<void> {
  const dataDir = resolveWorkflowDataDir(projectRoot);
  const sanitizedRecord = sanitizeWorkflowRecord(record);
  await mkdir(dataDir, { recursive: true });
  await writeFile(
    workflowFilePath(projectRoot, sanitizedRecord.run.id),
    JSON.stringify(sanitizedRecord, null, 2),
    "utf8"
  );
}

export async function readWorkflowRecord(
  projectRoot: string,
  workflowId: string
): Promise<StoredWorkflowRecord | null> {
  try {
    const text = await readFile(workflowFilePath(projectRoot, workflowId), "utf8");
    const parsed = JSON.parse(text) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "run" in parsed &&
      "request" in parsed
    ) {
      return sanitizeWorkflowRecord(parsed as StoredWorkflowRecord);
    }
    return null;
  } catch {
    return null;
  }
}

export async function readWorkflowRun(
  projectRoot: string,
  workflowId: string
): Promise<WorkflowRun | null> {
  try {
    const text = await readFile(workflowFilePath(projectRoot, workflowId), "utf8");
    return extractRun(JSON.parse(text));
  } catch {
    return null;
  }
}

export async function redactPersistedWorkflowSecrets(projectRoot: string): Promise<number> {
  try {
    const dataDir = resolveWorkflowDataDir(projectRoot);
    const entries = await readdir(dataDir);
    let rewritten = 0;

    for (const entry of entries.filter((item) => item.endsWith(".json"))) {
      const fullPath = path.join(dataDir, entry);
      const text = await readFile(fullPath, "utf8");
      const parsed = JSON.parse(text) as unknown;
      if (!parsed || typeof parsed !== "object") {
        continue;
      }

      if (!("run" in parsed) || !("request" in parsed)) {
        continue;
      }

      const record = parsed as StoredWorkflowRecord;
      if (!requestContainsPlaintextSecrets(record.request)) {
        continue;
      }

      await writeFile(fullPath, JSON.stringify(sanitizeWorkflowRecord(record), null, 2), "utf8");
      rewritten += 1;
    }

    return rewritten;
  } catch {
    return 0;
  }
}

export async function listWorkflowRuns(projectRoot: string): Promise<WorkflowListItem[]> {
  try {
    const dataDir = resolveWorkflowDataDir(projectRoot);
    const entries = await readdir(dataDir);
    const items = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".json"))
        .map(async (entry) => {
          const text = await readFile(path.join(dataDir, entry), "utf8");
          const run = extractRun(JSON.parse(text));
          return run ? toWorkflowListItem(run) : null;
        })
    );

    return items
      .filter((item): item is WorkflowListItem => Boolean(item))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch {
    return [];
  }
}
