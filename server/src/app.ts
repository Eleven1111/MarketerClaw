import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { existsSync } from "node:fs";
import {
  DEFAULT_WORKFLOW_CONTROL,
  PLATFORM_OPTIONS,
  ROLE_DEFINITIONS,
  WORKFLOW_TEMPLATES
} from "./catalog.js";
import { AGENT_REGISTRY } from "./agents.js";
import { runWorkflow } from "./engine.js";
import {
  exportJson,
  exportMarkdown,
  exportPdf,
  exportPlatformAssetOnepagerMarkdown,
  exportPlatformAssetOnepagerPdf,
  exportPlatformAssetsJson,
  exportPlatformAssetsMarkdown,
  exportPlatformAssetsPdf
} from "./exporters.js";
import {
  createWorkflowRequestSchema,
  exportQuerySchema,
  rerunWorkflowFromSchema
} from "./schemas.js";
import { SKILL_LIBRARY } from "./skills.js";
import {
  listWorkflowRuns,
  persistWorkflowRecord,
  readWorkflowRecord,
  readWorkflowRun
} from "./storage.js";
import type { SetupResponse, WorkflowStreamEvent } from "./types.js";

type CreateAppOptions = {
  projectRoot: string;
  enableStaticClient?: boolean;
};

function normalizeBasePath(value?: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/g, "");
}

function writeSseEvent(response: express.Response, event: WorkflowStreamEvent): void {
  response.write(`event: ${event.type}\n`);
  response.write(`data: ${JSON.stringify(event.payload)}\n\n`);
}

export function createApp(options: CreateAppOptions): express.Express {
  const { projectRoot, enableStaticClient = true } = options;
  const clientDistPath = path.join(projectRoot, "dist");
  const basePath = normalizeBasePath(process.env.APP_BASE_PATH);
  const app = express();
  const router = express.Router();

  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );

  app.use(
    cors({
      origin:
        process.env.NODE_ENV === "production"
          ? undefined
          : ["http://localhost:5173", "http://127.0.0.1:5173"],
      methods: ["GET", "POST"],
      credentials: false
    })
  );

  app.use(express.json({ limit: "2mb" }));

  const workflowLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 12,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many workflow requests, please retry in one minute."
    }
  });

  router.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      uptime: process.uptime()
    });
  });

  const sendSetup = (_request: express.Request, response: express.Response) => {
    const builtinTemplates = Object.values(WORKFLOW_TEMPLATES).map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      stageCount: template.stages.length,
      estimatedSeconds: template.stages.reduce(
        (sum, stage) => sum + stage.defaultStageSeconds,
        0
      ),
      focus: template.focus
    }));

    const setup: SetupResponse = {
      roles: ROLE_DEFINITIONS,
      agents: AGENT_REGISTRY,
      templates: [
        ...builtinTemplates,
        {
          id: "custom",
          name: "自定义营销工作流",
          description: "手动配置环节、步骤、角色与交付物。",
          stageCount: 0,
          estimatedSeconds: 0,
          focus: ["自定义"]
        }
      ],
      skills: SKILL_LIBRARY,
      platforms: [...PLATFORM_OPTIONS],
      defaults: {
        templateId: "launch_cn",
        workflowControl: {
          defaultStepSeconds: DEFAULT_WORKFLOW_CONTROL.defaultStepSeconds,
          totalSeconds: DEFAULT_WORKFLOW_CONTROL.totalSeconds
        }
      }
    };

    response.json(setup);
  };

  router.get("/api/setup", sendSetup);
  router.get("/api/workflows/setup", sendSetup);
  router.get("/api/workflows", async (_request, response) => {
    const items = await listWorkflowRuns(projectRoot);
    response.json({ items });
  });

  router.post("/api/workflows", workflowLimiter, async (request, response) => {
    const parsed = createWorkflowRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({
        error: "Invalid payload",
        details: parsed.error.flatten()
      });
    }

    try {
      const run = await runWorkflow(parsed.data);
      await persistWorkflowRecord(projectRoot, {
        request: parsed.data,
        run
      });
      return response.status(201).json(run);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown server error";
      return response.status(500).json({
        error: "Failed to run workflow",
        reason
      });
    }
  });

  router.post("/api/workflows/stream", workflowLimiter, async (request, response) => {
    const parsed = createWorkflowRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({
        error: "Invalid payload",
        details: parsed.error.flatten()
      });
    }

    response.status(200);
    response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders();

    let closed = false;
    request.on("close", () => {
      closed = true;
    });

    const forwardEvent = (event: WorkflowStreamEvent) => {
      if (closed) {
        return;
      }
      writeSseEvent(response, event);
    };

    response.write(": stream-open\n\n");

    try {
      const run = await runWorkflow(parsed.data, {
        onEvent: forwardEvent
      });
      await persistWorkflowRecord(projectRoot, {
        request: parsed.data,
        run
      });

      if (!closed) {
        response.end();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown server error";
      forwardEvent({
        type: "error",
        payload: { message }
      });
      if (!closed) {
        response.end();
      }
    }
  });

  router.post("/api/workflows/:id/rerun", workflowLimiter, async (request, response) => {
    const record = await readWorkflowRecord(projectRoot, request.params.id);
    if (!record) {
      return response.status(404).json({
        error: "Workflow not found"
      });
    }

    try {
      const rerun = await runWorkflow(record.request, {}, {
        rerunOf: record.run.id,
        rerunMode: "full"
      });
      await persistWorkflowRecord(projectRoot, {
        request: record.request,
        run: rerun
      });
      return response.status(201).json(rerun);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown server error";
      return response.status(500).json({
        error: "Failed to rerun workflow",
        reason
      });
    }
  });

  router.post("/api/workflows/:id/rerun-from", workflowLimiter, async (request, response) => {
    const parsed = rerunWorkflowFromSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({
        error: "Invalid rerun payload",
        details: parsed.error.flatten()
      });
    }

    const record = await readWorkflowRecord(projectRoot, request.params.id);
    if (!record) {
      return response.status(404).json({
        error: "Workflow not found or does not support targeted rerun"
      });
    }

    try {
      const rerun = await runWorkflow(record.request, {}, {
        rerunOf: record.run.id,
        rerunMode: parsed.data.roleId ? "role" : "stage",
        startStageId: parsed.data.stageId,
        startRoleId: parsed.data.roleId,
        previousRun: record.run
      });
      await persistWorkflowRecord(projectRoot, {
        request: record.request,
        run: rerun
      });
      return response.status(201).json(rerun);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown server error";
      return response.status(500).json({
        error: "Failed to rerun workflow from target",
        reason
      });
    }
  });

  router.get("/api/workflows/:id", async (request, response) => {
    const run = await readWorkflowRun(projectRoot, request.params.id);
    if (!run) {
      return response.status(404).json({
        error: "Workflow not found"
      });
    }

    return response.json(run);
  });

  router.get("/api/workflows/:id/export", async (request, response) => {
    const parsedQuery = exportQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return response.status(400).json({
        error: "Invalid export format"
      });
    }

    const run = await readWorkflowRun(projectRoot, request.params.id);
    if (!run) {
      return response.status(404).json({
        error: "Workflow not found"
      });
    }

    const { format } = parsedQuery.data;
    const requestedPlatform = parsedQuery.data.platform;

    if (format === "json") {
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.setHeader(
        "Content-Disposition",
        `attachment; filename="${run.id}-full.json"`
      );
      return response.send(exportJson(run));
    }

    if (format === "markdown") {
      response.setHeader("Content-Type", "text/markdown; charset=utf-8");
      response.setHeader(
        "Content-Disposition",
        `attachment; filename="${run.id}-full.md"`
      );
      return response.send(exportMarkdown(run, "full"));
    }

    if (format === "platform-assets-json") {
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.setHeader(
        "Content-Disposition",
        `attachment; filename="${run.id}-platform-assets.json"`
      );
      return response.send(exportPlatformAssetsJson(run));
    }

    if (format === "platform-assets-markdown") {
      response.setHeader("Content-Type", "text/markdown; charset=utf-8");
      response.setHeader(
        "Content-Disposition",
        `attachment; filename="${run.id}-platform-assets.md"`
      );
      return response.send(exportPlatformAssetsMarkdown(run));
    }

    if (format === "platform-assets-pdf") {
      const pdfBuffer = exportPlatformAssetsPdf(run);
      response.setHeader("Content-Type", "application/pdf");
      response.setHeader(
        "Content-Disposition",
        `attachment; filename="${run.id}-platform-assets.pdf"`
      );
      return response.send(pdfBuffer);
    }

    if (
      format === "platform-asset-onepager-markdown" ||
      format === "platform-asset-onepager-pdf"
    ) {
      const platform = requestedPlatform ?? "";
      const hasPlatformAsset = run.deliverables.platformAssets.some(
        (item) => item.platform === platform
      );
      if (!hasPlatformAsset) {
        return response.status(404).json({
          error: "Platform asset not found"
        });
      }

      if (format === "platform-asset-onepager-markdown") {
        response.setHeader("Content-Type", "text/markdown; charset=utf-8");
        response.setHeader(
          "Content-Disposition",
          `attachment; filename="${run.id}-${encodeURIComponent(platform)}-onepager.md"`
        );
        return response.send(exportPlatformAssetOnepagerMarkdown(run, platform));
      }

      const pdfBuffer = exportPlatformAssetOnepagerPdf(run, platform);
      response.setHeader("Content-Type", "application/pdf");
      response.setHeader(
        "Content-Disposition",
        `attachment; filename="${run.id}-${encodeURIComponent(platform)}-onepager.pdf"`
      );
      return response.send(pdfBuffer);
    }

    const isSummary = format === "pdf-summary";
    const pdfBuffer = exportPdf(run, isSummary ? "summary" : "full");

    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${run.id}-${isSummary ? "summary" : "full"}.pdf"`
    );
    return response.send(pdfBuffer);
  });

  if (enableStaticClient && existsSync(clientDistPath)) {
    router.use(express.static(clientDistPath));
    router.get("*", (request, response, next) => {
      if (request.path.startsWith("/api")) {
        return next();
      }
      return response.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  if (basePath) {
    app.use(basePath, router);
  } else {
    app.use(router);
  }

  return app;
}
