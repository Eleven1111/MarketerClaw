import { z } from "zod";
import { REQUIRED_ROLE_IDS, ROLE_IDS, TEMPLATE_IDS, type RoleId } from "./catalog.js";

const roleIdSchema = z.enum(ROLE_IDS);
const templateIdSchema = z.enum(TEMPLATE_IDS);

function hasProviderApiKeyFallback(mode: "mock" | "openai"): boolean {
  if (mode === "openai") {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  }
  return false;
}

function hasProviderModelFallback(mode: "mock" | "openai"): boolean {
  if (mode === "openai") {
    return Boolean(process.env.OPENAI_MODEL?.trim());
  }
  return false;
}

const roleModelConfigSchema = z
  .object({
    mode: z.enum(["mock", "openai"]).default("openai"),
    baseUrl: z.string().trim().default(""),
    apiKey: z.string().trim().default(""),
    model: z.string().trim().default(""),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().min(128).max(4000).default(700),
    timeoutMs: z.number().int().min(2000).max(120000).default(30000),
    systemPrompt: z.string().trim().max(3000).optional()
  })
  .transform((value) => ({
    ...value,
    baseUrl: value.baseUrl.trim(),
    apiKey: value.apiKey.trim(),
    model: value.model.trim()
  }));

const configuredRoleSchema = z.object({
  roleId: roleIdSchema,
  enabled: z.boolean().default(true),
  displayName: z.string().trim().min(1).max(40),
  model: roleModelConfigSchema
});

const roleStepSecondsSchema = z.record(roleIdSchema, z.number().int().min(10).max(300)).default({});

const campaignContextSchema = z.object({
  projectName: z.string().trim().min(2).max(80),
  productName: z.string().trim().min(2).max(80),
  brief: z.string().trim().min(12).max(2000),
  objective: z.string().trim().min(4).max(120),
  targetAudience: z.string().trim().min(4).max(180),
  primaryPlatform: z.string().trim().min(2).max(40),
  secondaryPlatforms: z.array(z.string().trim().min(2).max(40)).max(5).default([]),
  campaignWindow: z.string().trim().min(2).max(80),
  regionFocus: z.string().trim().min(2).max(80),
  brandTone: z.string().trim().min(4).max(120),
  productProofPoints: z.array(z.string().trim().min(2).max(120)).max(8).default([]),
  competitorNotes: z.array(z.string().trim().min(2).max(120)).max(8).default([]),
  competitorEntries: z
    .array(
      z.object({
        competitor: z.string().trim().min(2).max(60),
        platform: z.string().trim().min(2).max(40),
        move: z.string().trim().min(2).max(120),
        messageAngle: z.string().trim().min(2).max(120),
        weakness: z.string().trim().min(2).max(120)
      })
    )
    .max(8)
    .default([]),
  channelConstraints: z.string().trim().max(220).default(""),
  budgetRange: z.string().trim().min(2).max(60),
  kpis: z.string().trim().min(4).max(180),
  riskNotes: z.string().trim().max(220).default(""),
  deliverableSpec: z.string().trim().min(4).max(220)
});

const customStepSchema = z.object({
  roleId: roleIdSchema,
  intent: z.string().trim().min(2).max(120),
  outputTitle: z.string().trim().min(2).max(80),
  skillIds: z.array(z.string().trim().min(2).max(60)).max(8).optional(),
  stepSeconds: z.number().int().min(10).max(360).optional()
});

const customStageSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z][a-z0-9_-]*$/i, "stage.id 需为字母开头，可包含字母数字_-"),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(2).max(220),
  defaultStageSeconds: z.number().int().min(30).max(2400),
  steps: z.array(customStepSchema).min(1).max(30)
});

const customTemplateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(2).max(220),
  stages: z.array(customStageSchema).min(1).max(12)
});

const workflowControlSchema = z.object({
  defaultStepSeconds: z.number().int().min(20).max(300).default(90),
  totalSeconds: z.number().int().min(300).max(7200).default(1800),
  stageSeconds: z.record(z.string(), z.number().int().min(30).max(2400)).default({}),
  roleStepSeconds: roleStepSecondsSchema
});

export const createWorkflowRequestSchema = z
  .object({
    campaign: campaignContextSchema,
    templateId: templateIdSchema,
    customTemplate: customTemplateSchema.optional(),
    roles: z.array(configuredRoleSchema).min(4),
    workflowControl: workflowControlSchema
  })
  .superRefine((payload, ctx) => {
    const seenIds = new Set<(typeof ROLE_IDS)[number]>();

    for (const role of payload.roles) {
      if (seenIds.has(role.roleId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roles"],
          message: `角色 ${role.roleId} 重复配置`
        });
      }
      seenIds.add(role.roleId);

      if (role.model.mode === "openai") {
        if (!role.model.apiKey && !hasProviderApiKeyFallback(role.model.mode)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["roles"],
            message: `角色 ${role.displayName} 使用 OpenAI 兼容模式时需要 apiKey，或在服务端配置 OPENAI_API_KEY`
          });
        }
        if (!role.model.model && !hasProviderModelFallback(role.model.mode)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["roles"],
            message: `角色 ${role.displayName} 使用 OpenAI 兼容模式时需要 model，或在服务端配置 OPENAI_MODEL`
          });
        }
      }
    }

    for (const requiredRoleId of REQUIRED_ROLE_IDS) {
      const found = payload.roles.find((role) => role.roleId === requiredRoleId);
      if (!found || !found.enabled) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roles"],
          message: `缺少必选角色 ${requiredRoleId}`
        });
      }
    }

    if (payload.templateId === "custom") {
      if (!payload.customTemplate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customTemplate"],
          message: "选择自定义工作流时必须提供 customTemplate"
        });
      } else {
        const stageIds = new Set<string>();
        for (const stage of payload.customTemplate.stages) {
          if (stageIds.has(stage.id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["customTemplate", "stages"],
              message: `自定义环节 ID 重复：${stage.id}`
            });
          }
          stageIds.add(stage.id);
        }
      }
    }

    if (payload.templateId !== "custom" && payload.customTemplate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customTemplate"],
        message: "仅在 templateId=custom 时允许传入 customTemplate"
      });
    }

    if (payload.customTemplate) {
      const enabledRoleIds = new Set<RoleId>(
        payload.roles.filter((role) => role.enabled).map((role) => role.roleId)
      );
      for (const stage of payload.customTemplate.stages) {
        for (const step of stage.steps) {
          if (!enabledRoleIds.has(step.roleId)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["customTemplate", "stages"],
              message: `环节 ${stage.name} 使用了未启用角色：${step.roleId}`
            });
          }
        }
      }
    }
  });

export const exportQuerySchema = z.object({
  format: z.enum([
    "markdown",
    "json",
    "pdf-summary",
    "pdf-full",
    "platform-assets-markdown",
    "platform-assets-json",
    "platform-assets-pdf",
    "platform-asset-onepager-markdown",
    "platform-asset-onepager-pdf"
  ]),
  platform: z.string().trim().min(2).max(60).optional()
}).superRefine((payload, ctx) => {
  if (
    (payload.format === "platform-asset-onepager-markdown" ||
      payload.format === "platform-asset-onepager-pdf") &&
    !payload.platform
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["platform"],
      message: "单页平台资产导出必须提供 platform"
    });
  }
});

export const rerunWorkflowFromSchema = z
  .object({
    stageId: z.string().trim().min(2).max(40).optional(),
    roleId: roleIdSchema.optional()
  })
  .superRefine((payload, ctx) => {
    if (!payload.stageId && !payload.roleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: "必须提供 stageId 或 roleId"
      });
    }
  });

export type ParsedCreateWorkflowRequest = z.infer<typeof createWorkflowRequestSchema>;
export type ParsedExportQuery = z.infer<typeof exportQuerySchema>;
export type ParsedRerunWorkflowFrom = z.infer<typeof rerunWorkflowFromSchema>;
