import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import type {
  AgentRegistryEntry,
  CampaignContext,
  ConfiguredRole,
  ModelMode,
  RoleDefinition,
  RoleId,
  SetupResponse,
  TemplateMeta,
  WorkflowCreatePayload,
  WorkflowListItem,
  WorkflowMeta,
  WorkflowRun,
  WorkflowStage,
  WorkflowStep
} from "./types";

function normalizeAppBase(value?: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }
  return trimmed.replace(/\/+$/g, "");
}

const API_BASE = normalizeAppBase(
  import.meta.env.VITE_API_BASE_URL || import.meta.env.BASE_URL
);

type ViewTab = "configure" | "live" | "review";
type RequestState = "idle" | "loading" | "error";
type ExportFormat =
  | "markdown"
  | "json"
  | "pdf-summary"
  | "pdf-full"
  | "platform-assets-markdown"
  | "platform-assets-json"
  | "platform-assets-pdf"
  | "platform-asset-onepager-markdown"
  | "platform-asset-onepager-pdf";

type EditableCustomTemplate = NonNullable<WorkflowCreatePayload["customTemplate"]>;
type EditableStage = EditableCustomTemplate["stages"][number];
type EditableStep = EditableStage["steps"][number];

const LANE_LABELS: Record<RoleDefinition["lane"], string> = {
  intake: "需求 intake",
  strategy: "策略规划",
  production: "内容生产",
  distribution: "渠道执行",
  review: "审核节点",
  operations: "运营支撑"
};

const ARTIFACT_KIND_LABELS = {
  brief: "Brief",
  strategy: "策略",
  content: "内容",
  channel: "渠道",
  review: "审核",
  ops: "运营"
} as const;

const ARTIFACT_STATUS_LABELS = {
  draft: "草稿",
  approved: "通过",
  needs_changes: "待修改"
} as const;

const PLATFORM_ASSET_LABELS = {
  xiaohongshu_note: "小红书笔记卡",
  douyin_script: "抖音脚本卡",
  wechat_article: "微信长文框架",
  weibo_post: "微博内容卡",
  bilibili_video: "B站测评/种草卡",
  private_domain: "私域承接方案",
  generic_asset: "平台适配资产"
} as const;

function createInitialCampaign(): CampaignContext {
  return {
    projectName: "春季新品增长战役",
    productName: "轻养零糖茶",
    brief:
      "为一款面向 25-35 岁都市白领的零糖即饮茶制定新品上市 campaign，希望在首月完成声量破圈和首批转化。",
    objective: "完成新品上市首月的种草破圈与首批成交转化",
    targetAudience: "一二线城市 25-35 岁女性白领，关注轻养生、颜值和低负担饮品",
    primaryPlatform: "小红书",
    secondaryPlatforms: ["抖音", "微信生态"],
    campaignWindow: "4 月上旬到 5 月中旬",
    regionFocus: "上海、杭州、深圳",
    brandTone: "专业但不端着，轻松、有审美、可信赖",
    productProofPoints: ["零糖但口感不寡淡", "通勤和下午场景都适合", "包装颜值适合拍照分享"],
    competitorEntries: [
      {
        competitor: "竞品 A",
        platform: "小红书",
        move: "集中铺达人对比测评",
        messageAngle: "成分更轻、更适合上班场景",
        weakness: "体验证据薄弱，更多停留在话术层"
      },
      {
        competitor: "竞品 B",
        platform: "抖音",
        move: "短视频强调清爽解腻和大促优惠",
        messageAngle: "价格刺激和即时下单",
        weakness: "品牌感弱，容易陷入低价竞争"
      }
    ],
    competitorNotes: ["竞品近期主打轻养生成分故事", "竞品在小红书集中铺达人对比测评"],
    channelConstraints: "首波达人资源有限，短视频素材需要优先复用",
    budgetRange: "20-30 万元",
    kpis: "品牌搜索增长、内容互动率、留资量、首购转化率",
    riskNotes: "避免夸大健康功效，不能使用绝对化表达或医疗暗示",
    deliverableSpec: "输出策略摘要、内容矩阵、渠道动作、审核意见和复盘建议"
  };
}

function defaultRoleConfig(role: RoleDefinition): ConfiguredRole {
  return {
    roleId: role.id,
    enabled: true,
    displayName: role.label,
    model: {
      mode: "openai",
      baseUrl: "",
      apiKey: "",
      model: "",
      temperature: 0.7,
      maxTokens: 700,
      timeoutMs: 30000,
      systemPrompt: role.defaultPrompt
    }
  };
}

function createDefaultCustomTemplate(): EditableCustomTemplate {
  return {
    name: "我的营销工作流",
    description: "可编辑环节、角色、交付物和步骤时长。",
    stages: [
      {
        id: "brief_intake",
        name: "需求 intake",
        description: "统一项目目标、约束与交付边界。",
        defaultStageSeconds: 180,
        steps: [
          {
            roleId: "briefDesk",
            intent: "整理业务输入，形成营销 brief。",
            outputTitle: "需求简报",
            stepSeconds: 70
          }
        ]
      },
      {
        id: "review_gate",
        name: "审核闭环",
        description: "在交付前完成品牌和合规审核。",
        defaultStageSeconds: 180,
        steps: [
          {
            roleId: "brandReviewer",
            intent: "检查品牌调性和表达一致性。",
            outputTitle: "品牌审校意见",
            stepSeconds: 60
          },
          {
            roleId: "complianceGuard",
            intent: "检查广告法和平台规则风险。",
            outputTitle: "合规审查意见",
            stepSeconds: 60
          }
        ]
      }
    ]
  };
}

function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function byRequiredFirst(left: RoleDefinition, right: RoleDefinition): number {
  if (left.required && !right.required) {
    return -1;
  }
  if (!left.required && right.required) {
    return 1;
  }
  return left.label.localeCompare(right.label, "zh-Hans-CN");
}

function providerHint(mode: ModelMode): {
  baseUrlPlaceholder: string;
  modelPlaceholder: string;
  helper: string;
} {
  if (mode === "openai") {
    return {
      baseUrlPlaceholder: "http://127.0.0.1:8999 或 https://api.openai.com",
      modelPlaceholder: "bailian/glm-5",
      helper:
        "默认复用服务端 OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_MODEL。OpenClaw 本机代理请填 http://127.0.0.1:8999；系统会自动补成 /v1/chat/completions。"
    };
  }

  return {
    baseUrlPlaceholder: "",
    modelPlaceholder: "",
    helper: ""
  };
}

function normalizeStageId(input: string, index: number): string {
  const lower = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/^[^a-z]+/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (lower.length >= 2) {
    return lower;
  }
  return `stage_${index + 1}`;
}

function parsePlatformInput(value: string): string[] {
  return value
    .split(/[,\n，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLineInput(value: string): string[] {
  return value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function includesKeyword(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function parseDelimitedLine(line: string, separator: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === separator) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function looksLikeCompetitorHeader(values: string[]): boolean {
  const normalized = values
    .map((value) => value.replace(/^\uFEFF/, "").trim().toLowerCase())
    .join("|");

  return (
    (normalized.includes("competitor") || normalized.includes("竞品")) &&
    (normalized.includes("platform") || normalized.includes("平台"))
  );
}

function serializeCompetitorEntries(
  entries: CampaignContext["competitorEntries"]
): string {
  return entries
    .map((item) =>
      [
        item.competitor,
        item.platform,
        item.move,
        item.messageAngle,
        item.weakness
      ].join(" | ")
    )
    .join("\n");
}

function normalizeCompetitorEntries(
  entries: CampaignContext["competitorEntries"]
): CampaignContext["competitorEntries"] {
  const seen = new Set<string>();

  return entries.filter((entry) => {
    const key = [
      entry.competitor,
      entry.platform,
      entry.move,
      entry.messageAngle,
      entry.weakness
    ]
      .map((value) => value.trim().toLowerCase())
      .join("|");

    if (!key.replace(/\|/g, "")) {
      return false;
    }

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function classifyCompetitorEntry(
  entry: CampaignContext["competitorEntries"][number]
): string {
  const combined = [
    entry.platform,
    entry.move,
    entry.messageAngle,
    entry.weakness
  ].join(" ");

  if (includesKeyword(combined, ["低价", "折扣", "优惠", "大促", "买赠"])) {
    return "价格促销";
  }
  if (includesKeyword(combined, ["达人", "kol", "koc", "测评", "探店"])) {
    return "达人种草";
  }
  if (includesKeyword(combined, ["直播", "直播间", "连播"])) {
    return "直播转化";
  }
  if (includesKeyword(combined, ["投流", "投放", "冲量", "dou+", "信息流"])) {
    return "付费投放";
  }
  if (includesKeyword(combined, ["成分", "功效", "品牌", "理念", "故事"])) {
    return "品牌叙事";
  }
  return "内容铺量";
}

function summarizeCompetitorCategories(
  entries: CampaignContext["competitorEntries"]
): string {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const category = classifyCompetitorEntry(entry);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([category, count]) => `${category} ${count}`)
    .join(" / ");
}

function parseCompetitorEntries(value: string): CampaignContext["competitorEntries"] {
  return normalizeCompetitorEntries(
    value
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [competitor, platform, move, messageAngle, weakness] = line
          .split(/[|｜\t]/)
          .map((item) => item.trim());

        return {
          competitor: competitor || "未命名竞品",
          platform: platform || "未标注平台",
          move: move || "未描述动作",
          messageAngle: messageAngle || "未描述信息角度",
          weakness: weakness || "未标注可攻击点"
        };
      })
  );
}

function parseCompetitorEntriesFromFile(
  value: string
): CampaignContext["competitorEntries"] {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const separator = lines.some((line) => line.includes("\t"))
    ? "\t"
    : lines.some((line) => line.includes("|") || line.includes("｜"))
      ? "|"
      : ",";

  const rows = lines.map((line) => {
    const parsed =
      separator === "|"
        ? line.split(/[|｜]/).map((item) => item.trim())
        : parseDelimitedLine(line, separator);
    if (parsed[0]) {
      parsed[0] = parsed[0].replace(/^\uFEFF/, "").trim();
    }
    return parsed;
  });

  const contentRows = looksLikeCompetitorHeader(rows[0] ?? []) ? rows.slice(1) : rows;

  return normalizeCompetitorEntries(
    contentRows
      .map(([competitor, platform, move, messageAngle, weakness]) => ({
        competitor: competitor || "未命名竞品",
        platform: platform || "未标注平台",
        move: move || "未描述动作",
        messageAngle: messageAngle || "未描述信息角度",
        weakness: weakness || "未标注可攻击点"
      }))
      .filter((item) => item.competitor !== "未命名竞品" || item.move !== "未描述动作")
  );
}

function summarizeCompetitorEntry(
  entry: CampaignContext["competitorEntries"][number]
): string {
  return `${entry.competitor} 在 ${entry.platform} 主打 ${entry.move}`;
}

function toCustomTemplatePayload(template: EditableCustomTemplate): EditableCustomTemplate {
  const seen = new Set<string>();

  const stages = template.stages.map((stage, index) => {
    const baseId = normalizeStageId(stage.id || stage.name, index);
    let stageId = baseId;
    let suffix = 2;

    while (seen.has(stageId)) {
      stageId = `${baseId}_${suffix}`;
      suffix += 1;
    }
    seen.add(stageId);

    return {
      id: stageId,
      name: stage.name.trim(),
      description: stage.description.trim(),
      defaultStageSeconds: stage.defaultStageSeconds,
      steps: stage.steps.map((step) => ({
        roleId: step.roleId,
        intent: step.intent.trim(),
        outputTitle: step.outputTitle.trim(),
        stepSeconds: step.stepSeconds
      }))
    };
  });

  return {
    name: template.name.trim(),
    description: template.description.trim(),
    stages
  };
}

function upsertStage(stages: WorkflowStage[], stage: WorkflowStage): WorkflowStage[] {
  const index = stages.findIndex((item) => item.id === stage.id);
  if (index < 0) {
    return [...stages, stage];
  }
  const next = [...stages];
  next[index] = stage;
  return next;
}

function parseSseEvent(rawEvent: string): { eventName: string; payload: unknown } | null {
  const lines = rawEvent.split(/\r?\n/);
  let eventName = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith(":")) {
      continue;
    }
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  try {
    return {
      eventName,
      payload: JSON.parse(dataLines.join("\n"))
    };
  } catch {
    return null;
  }
}

function approvalPhaseLabel(phase: WorkflowRun["approval"]["currentPhase"]): string {
  switch (phase) {
    case "drafting":
      return "Drafting";
    case "brand_review":
      return "品牌审校中";
    case "compliance_review":
      return "合规审查中";
    case "ready_to_launch":
      return "Ready to Launch";
    case "blocked":
      return "Blocked";
    default:
      return phase;
  }
}

function rerunModeLabel(mode: WorkflowListItem["rerunMode"]): string {
  switch (mode) {
    case "full":
      return "整单";
    case "stage":
      return "环节";
    case "role":
      return "角色";
    default:
      return mode;
  }
}

function App() {
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [setupState, setSetupState] = useState<RequestState>("loading");
  const [setupError, setSetupError] = useState("");
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowListItem[]>([]);
  const [historyState, setHistoryState] = useState<RequestState>("loading");
  const [historyError, setHistoryError] = useState("");

  const [campaign, setCampaign] = useState<CampaignContext>(createInitialCampaign());
  const initialCampaign = createInitialCampaign();
  const [secondaryPlatformsInput, setSecondaryPlatformsInput] = useState(
    initialCampaign.secondaryPlatforms.join("，")
  );
  const [proofPointsInput, setProofPointsInput] = useState(
    initialCampaign.productProofPoints.join("\n")
  );
  const [competitorEntriesInput, setCompetitorEntriesInput] = useState(
    serializeCompetitorEntries(initialCampaign.competitorEntries)
  );
  const [competitorNotesInput, setCompetitorNotesInput] = useState(
    initialCampaign.competitorNotes.join("\n")
  );
  const [competitorImportStatus, setCompetitorImportStatus] = useState(
    "支持导入 CSV、TSV 或 TXT，字段顺序为：竞品名 / 平台 / 动作 / 信息角度 / 可攻击点。"
  );
  const [templateId, setTemplateId] = useState<TemplateMeta["id"]>("launch_cn");
  const [customTemplate, setCustomTemplate] = useState<EditableCustomTemplate>(
    createDefaultCustomTemplate()
  );
  const [roles, setRoles] = useState<ConfiguredRole[]>([]);
  const [defaultStepSeconds, setDefaultStepSeconds] = useState(90);
  const [totalSeconds, setTotalSeconds] = useState(1800);

  const [runState, setRunState] = useState<RequestState>("idle");
  const [runError, setRunError] = useState("");
  const [streaming, setStreaming] = useState(false);

  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [liveMeta, setLiveMeta] = useState<WorkflowMeta | null>(null);
  const [liveStages, setLiveStages] = useState<WorkflowStage[]>([]);
  const [liveSteps, setLiveSteps] = useState<WorkflowStep[]>([]);
  const [liveCurrentStageId, setLiveCurrentStageId] = useState("");
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState(0);

  const [tab, setTab] = useState<ViewTab>("configure");

  async function loadWorkflowHistory() {
    try {
      setHistoryState("loading");
      const response = await fetch(`${API_BASE}/api/workflows`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as { items: WorkflowListItem[] };
      setWorkflowHistory(data.items);
      setHistoryState("idle");
      setHistoryError("");
    } catch (error) {
      setHistoryState("error");
      setHistoryError("历史运行加载失败。");
      console.error(error);
    }
  }

  useEffect(() => {
    async function loadSetup() {
      try {
        setSetupState("loading");
        const response = await fetch(`${API_BASE}/api/workflows/setup`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as SetupResponse;
        setSetup(data);
        setTemplateId(data.defaults.templateId);
        setDefaultStepSeconds(data.defaults.workflowControl.defaultStepSeconds);
        setTotalSeconds(data.defaults.workflowControl.totalSeconds);
        setRoles(data.roles.map((role) => defaultRoleConfig(role)));
        setCampaign((current) => ({
          ...current,
          primaryPlatform: data.platforms[0]?.label ?? current.primaryPlatform
        }));
        setSetupState("idle");
        setSetupError("");
      } catch (error) {
        setSetupState("error");
        setSetupError("初始化失败，请刷新后重试。若后端未启动，请先执行 npm run dev。");
        console.error(error);
      }
    }

    loadSetup();
    loadWorkflowHistory();
  }, []);

  const roleDictionary = useMemo(() => {
    const map = new Map<RoleId, RoleDefinition>();
    for (const role of setup?.roles ?? []) {
      map.set(role.id, role);
    }
    return map;
  }, [setup]);

  const skillCountByRole = useMemo(() => {
    const map = new Map<RoleId, number>();
    const skills = setup?.skills ?? [];
    for (const role of setup?.roles ?? []) {
      map.set(
        role.id,
        skills.filter((skill) => skill.appliesTo.includes(role.id)).length
      );
    }
    return map;
  }, [setup]);

  const enabledRoles = useMemo(() => roles.filter((role) => role.enabled), [roles]);

  const activeTemplate = useMemo(() => {
    return setup?.templates.find((template) => template.id === templateId) ?? null;
  }, [setup, templateId]);

  const customEstimatedSeconds = useMemo(() => {
    return customTemplate.stages.reduce((sum, stage) => sum + stage.defaultStageSeconds, 0);
  }, [customTemplate]);

  const parsedCompetitorEntries = useMemo(() => {
    return parseCompetitorEntries(competitorEntriesInput);
  }, [competitorEntriesInput]);

  const competitorCategorySummary = useMemo(() => {
    if (parsedCompetitorEntries.length === 0) {
      return "暂无结构化竞品。";
    }
    return `去重后保留 ${parsedCompetitorEntries.length} 条，类型分布：${summarizeCompetitorCategories(parsedCompetitorEntries)}`;
  }, [parsedCompetitorEntries]);

  const liveProgress = Math.min(
    100,
    Math.round((liveElapsedSeconds / Math.max(1, totalSeconds)) * 100)
  );

  const streamCurrentStageName =
    liveStages.find((stage) => stage.id === liveCurrentStageId)?.name ?? "等待环节开始";

  const currentStep = streaming
    ? liveSteps[liveSteps.length - 1] ?? null
    : run?.timeline[run.timeline.length - 1] ?? null;

  function updateCampaign<K extends keyof CampaignContext>(key: K, value: CampaignContext[K]) {
    setCampaign((current) => ({
      ...current,
      [key]: value
    }));
  }

  function updateRole(roleId: RoleId, updater: (current: ConfiguredRole) => ConfiguredRole) {
    setRoles((previous) =>
      previous.map((role) => (role.roleId === roleId ? updater(role) : role))
    );
  }

  function toggleRole(roleId: RoleId, enabled: boolean) {
    updateRole(roleId, (role) => ({ ...role, enabled }));
  }

  function roleInput(roleId: RoleId): ConfiguredRole {
    return roles.find((role) => role.roleId === roleId) ?? defaultRoleConfig(roleDictionary.get(roleId)!);
  }

  function updateCustomTemplate(updater: (current: EditableCustomTemplate) => EditableCustomTemplate) {
    setCustomTemplate((current) => updater(current));
  }

  function updateStage(stageIndex: number, updater: (stage: EditableStage) => EditableStage) {
    updateCustomTemplate((current) => ({
      ...current,
      stages: current.stages.map((stage, index) => (index === stageIndex ? updater(stage) : stage))
    }));
  }

  function addStage() {
    updateCustomTemplate((current) => ({
      ...current,
      stages: [
        ...current.stages,
        {
          id: `stage_${current.stages.length + 1}`,
          name: `新环节 ${current.stages.length + 1}`,
          description: "请补充环节说明",
          defaultStageSeconds: 180,
          steps: [
            {
              roleId: "briefDesk",
              intent: "补充当前环节要完成的任务。",
              outputTitle: "交付物标题",
              stepSeconds: defaultStepSeconds
            }
          ]
        }
      ]
    }));
  }

  function removeStage(stageIndex: number) {
    updateCustomTemplate((current) => ({
      ...current,
      stages: current.stages.filter((_stage, index) => index !== stageIndex)
    }));
  }

  function addStep(stageIndex: number) {
    updateStage(stageIndex, (stage) => ({
      ...stage,
      steps: [
        ...stage.steps,
        {
          roleId: "strategyLead",
          intent: "补充当前步骤的任务目标。",
          outputTitle: "新增交付物",
          stepSeconds: defaultStepSeconds
        }
      ]
    }));
  }

  function updateStep(
    stageIndex: number,
    stepIndex: number,
    updater: (step: EditableStep) => EditableStep
  ) {
    updateStage(stageIndex, (stage) => ({
      ...stage,
      steps: stage.steps.map((step, index) => (index === stepIndex ? updater(step) : step))
    }));
  }

  function removeStep(stageIndex: number, stepIndex: number) {
    updateStage(stageIndex, (stage) => ({
      ...stage,
      steps: stage.steps.filter((_step, index) => index !== stepIndex)
    }));
  }

  function resetLiveState() {
    setLiveMeta(null);
    setLiveStages([]);
    setLiveSteps([]);
    setLiveCurrentStageId("");
    setLiveElapsedSeconds(0);
  }

  function stageStatus(stageId: string): "completed" | "current" | "pending" {
    if (streaming) {
      if (stageId === liveCurrentStageId) {
        return "current";
      }
      if (liveStages.some((stage) => stage.id === stageId)) {
        return "completed";
      }
      return "pending";
    }

    if (run?.stages.some((stage) => stage.id === stageId)) {
      return "completed";
    }
    return "pending";
  }

  async function launchWorkflow() {
    if (!setup || streaming) {
      return;
    }

    const normalizedCompetitorEntries = parseCompetitorEntries(competitorEntriesInput);
    const normalizedCompetitorNotes = parseLineInput(competitorNotesInput);
    const normalizedCampaign: CampaignContext = {
      ...campaign,
      projectName: campaign.projectName.trim(),
      productName: campaign.productName.trim(),
      brief: campaign.brief.trim(),
      objective: campaign.objective.trim(),
      targetAudience: campaign.targetAudience.trim(),
      primaryPlatform: campaign.primaryPlatform.trim(),
      secondaryPlatforms: parsePlatformInput(secondaryPlatformsInput),
      campaignWindow: campaign.campaignWindow.trim(),
      regionFocus: campaign.regionFocus.trim(),
      brandTone: campaign.brandTone.trim(),
      productProofPoints: parseLineInput(proofPointsInput),
      competitorEntries: normalizedCompetitorEntries,
      competitorNotes:
        normalizedCompetitorNotes.length > 0
          ? normalizedCompetitorNotes
          : normalizedCompetitorEntries.map((item) => summarizeCompetitorEntry(item)),
      channelConstraints: campaign.channelConstraints.trim(),
      budgetRange: campaign.budgetRange.trim(),
      kpis: campaign.kpis.trim(),
      riskNotes: campaign.riskNotes.trim(),
      deliverableSpec: campaign.deliverableSpec.trim()
    };

    if (normalizedCampaign.projectName.length < 2 || normalizedCampaign.brief.length < 12) {
      setRunState("error");
      setRunError("请至少补全项目名称和较完整的营销 brief。");
      return;
    }

    let normalizedCustomTemplate: EditableCustomTemplate | undefined;
    if (templateId === "custom") {
      normalizedCustomTemplate = toCustomTemplatePayload(customTemplate);

      if (!normalizedCustomTemplate.name || !normalizedCustomTemplate.description) {
        setRunState("error");
        setRunError("自定义工作流需要填写名称和描述。");
        return;
      }

      const invalidStage = normalizedCustomTemplate.stages.find((stage) => {
        return (
          stage.name.length < 2 ||
          stage.description.length < 2 ||
          stage.steps.length === 0 ||
          stage.steps.some(
            (step) => step.intent.length < 2 || step.outputTitle.length < 2
          )
        );
      });

      if (invalidStage) {
        setRunState("error");
        setRunError(`环节「${invalidStage.name || invalidStage.id}」配置不完整。`);
        return;
      }
    }

    setRunState("loading");
    setRunError("");
    setStreaming(true);
    setRun(null);
    resetLiveState();
    setTab("live");

    const payload: WorkflowCreatePayload = {
      campaign: normalizedCampaign,
      templateId,
      customTemplate: normalizedCustomTemplate,
      roles,
      workflowControl: {
        defaultStepSeconds,
        totalSeconds,
        stageSeconds: {},
        roleStepSeconds: {}
      }
    };

    let receivedDone = false;
    let receivedError = false;

    try {
      const response = await fetch(`${API_BASE}/api/workflows/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok || !response.body) {
        const body = await response.text().catch(() => "");
        throw new Error(body || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        while (true) {
          const separator = buffer.indexOf("\n\n");
          if (separator < 0) {
            break;
          }

          const rawEvent = buffer.slice(0, separator);
          buffer = buffer.slice(separator + 2);

          const parsed = parseSseEvent(rawEvent);
          if (!parsed) {
            continue;
          }

          const { eventName, payload: eventPayload } = parsed;

          if (eventName === "meta") {
            setLiveMeta(eventPayload as WorkflowMeta);
            continue;
          }

          if (eventName === "stage_start") {
            const stage = eventPayload as {
              id: string;
              name: string;
              description: string;
              allocatedSeconds: number;
            };
            setLiveCurrentStageId(stage.id);
            setLiveStages((current) =>
              upsertStage(current, {
                id: stage.id,
                name: stage.name,
                description: stage.description,
                allocatedSeconds: stage.allocatedSeconds,
                actualSeconds: 0,
                overtimeSeconds: 0,
                steps: []
              })
            );
            continue;
          }

          if (eventName === "step") {
            const step = eventPayload as WorkflowStep;
            setLiveSteps((current) => [...current, step]);
            setLiveElapsedSeconds(step.endedAtSecond);
            setLiveStages((current) => {
              const index = current.findIndex((stage) => stage.id === step.stageId);
              if (index < 0) {
                return [
                  ...current,
                  {
                    id: step.stageId,
                    name: step.stageName,
                    description: "",
                    allocatedSeconds: step.allocatedSeconds,
                    actualSeconds: step.endedAtSecond - step.startedAtSecond,
                    overtimeSeconds: step.overtimeSeconds,
                    steps: [step]
                  }
                ];
              }

              const next = [...current];
              const target = next[index] as WorkflowStage;
              next[index] = {
                ...target,
                actualSeconds:
                  target.actualSeconds + (step.endedAtSecond - step.startedAtSecond),
                overtimeSeconds: target.overtimeSeconds + step.overtimeSeconds,
                steps: [...target.steps, step]
              };
              return next;
            });
            continue;
          }

          if (eventName === "stage_end") {
            const stage = eventPayload as WorkflowStage;
            setLiveStages((current) => upsertStage(current, stage));
            continue;
          }

          if (eventName === "done") {
            const runData = eventPayload as WorkflowRun;
            receivedDone = true;
            setRun(runData);
            setLiveElapsedSeconds(runData.totalActualSeconds);
            setRunState("idle");
            setStreaming(false);
            setTab("review");
            void loadWorkflowHistory();
            continue;
          }

          if (eventName === "error") {
            const message =
              (eventPayload as { message?: string }).message ?? "流式执行失败";
            receivedError = true;
            setRunState("error");
            setRunError(message);
            setStreaming(false);
          }
        }
      }

      if (!receivedDone && !receivedError) {
        throw new Error("流式连接已结束，但未收到完成事件。");
      }
    } catch (error) {
      setRunState("error");
      setRunError(error instanceof Error ? error.message : "创建工作流失败");
      setStreaming(false);
      console.error(error);
    }
  }

  async function rerunWorkflow(workflowId: string) {
    try {
      setRunState("loading");
      setRunError("");
      const response = await fetch(`${API_BASE}/api/workflows/${workflowId}/rerun`, {
        method: "POST"
      });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(body || `HTTP ${response.status}`);
      }
      const rerun = (await response.json()) as WorkflowRun;
      setRun(rerun);
      setStreaming(false);
      setLiveMeta(null);
      setLiveStages([]);
      setLiveSteps([]);
      setLiveCurrentStageId("");
      setLiveElapsedSeconds(rerun.totalActualSeconds);
      setRunState("idle");
      setTab("review");
      await loadWorkflowHistory();
    } catch (error) {
      setRunState("error");
      setRunError(error instanceof Error ? error.message : "重跑失败");
      console.error(error);
    }
  }

  async function rerunWorkflowFromTarget(
    workflowId: string,
    target: { stageId?: string; roleId?: RoleId }
  ) {
    try {
      setRunState("loading");
      setRunError("");
      const response = await fetch(`${API_BASE}/api/workflows/${workflowId}/rerun-from`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(target)
      });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(body || `HTTP ${response.status}`);
      }
      const rerun = (await response.json()) as WorkflowRun;
      setRun(rerun);
      setStreaming(false);
      resetLiveState();
      setLiveElapsedSeconds(rerun.totalActualSeconds);
      setRunState("idle");
      setTab("review");
      await loadWorkflowHistory();
    } catch (error) {
      setRunState("error");
      setRunError(error instanceof Error ? error.message : "定向重跑失败");
      console.error(error);
    }
  }

  async function openWorkflow(workflowId: string) {
    try {
      const response = await fetch(`${API_BASE}/api/workflows/${workflowId}`);
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(body || `HTTP ${response.status}`);
      }
      const workflow = (await response.json()) as WorkflowRun;
      setRun(workflow);
      setStreaming(false);
      resetLiveState();
      setLiveElapsedSeconds(workflow.totalActualSeconds);
      setTab("review");
      setRunError("");
    } catch (error) {
      setRunState("error");
      setRunError(error instanceof Error ? error.message : "加载运行详情失败");
      console.error(error);
    }
  }

  async function handleCompetitorFileImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const entries = parseCompetitorEntriesFromFile(text);
      if (entries.length === 0) {
        throw new Error("文件中没有识别到可用的竞品记录。");
      }

      setCompetitorEntriesInput(serializeCompetitorEntries(entries));
      if (!competitorNotesInput.trim()) {
        setCompetitorNotesInput(entries.map((item) => summarizeCompetitorEntry(item)).join("\n"));
      }
      const categorySummary = summarizeCompetitorCategories(entries);
      setCompetitorImportStatus(
        `已导入 ${entries.length} 条竞品记录，并自动完成去重和分类。类型分布：${categorySummary}。来源文件：${file.name}`
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : "导入失败";
      setCompetitorImportStatus(`导入失败：${reason}`);
      console.error(error);
    } finally {
      event.target.value = "";
    }
  }

  function downloadCompetitorTemplate() {
    const content = [
      "competitor\tplatform\tmove\tmessageAngle\tweakness",
      "竞品 A\t小红书\t达人测评铺量\t成分更轻更适合白领\t体验证据薄弱",
      "竞品 B\t抖音\t低价短视频冲量\t即时优惠刺激\t品牌感弱"
    ].join("\n");

    const blob = new Blob([content], {
      type: "text/tab-separated-values;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "competitor-import-template.tsv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openExport(format: ExportFormat, platform?: string) {
    if (!run) {
      return;
    }
    const search = new URLSearchParams({ format });
    if (platform) {
      search.set("platform", platform);
    }
    window.open(`${API_BASE}/api/workflows/${run.id}/export?${search.toString()}`, "_blank");
  }

  if (setupState === "loading") {
    return <div className="state-view">正在加载营销作战系统配置...</div>;
  }

  if (setupState === "error" || !setup) {
    return <div className="state-view">{setupError || "配置加载失败"}</div>;
  }

  const displayedStages = streaming ? liveStages : run?.stages ?? [];
  const displayedSteps = streaming ? liveSteps : run?.timeline ?? [];

  return (
    <div className="app-shell">
      <div className="bg-grid" />
      <div className="bg-glow bg-glow-a" />
      <div className="bg-glow bg-glow-b" />

      <header className="app-header">
        <div className="hero">
          <p className="kicker">MarketerClaw</p>
          <h1>中国营销作战系统</h1>
          <p className="subtitle">
            面向品牌市场、内容运营、投放和增长团队的工作流引擎。输入 brief，系统自动推进策略、内容、渠道和审核闭环。
          </p>
          <div className="hero-badges">
            <span>营销 brief</span>
            <span>Skills Library</span>
            <span>品牌/合规双审</span>
          </div>
        </div>

        <div className="header-meta">
          <div>
            <span>已启用角色</span>
            <strong>{enabledRoles.length}</strong>
          </div>
          <div>
            <span>当前模板</span>
            <strong>{templateId === "custom" ? customTemplate.name : activeTemplate?.name ?? "-"}</strong>
          </div>
          <div>
            <span>主平台</span>
            <strong>{campaign.primaryPlatform}</strong>
          </div>
          <div>
            <span>总时长上限</span>
            <strong>{formatClock(totalSeconds)}</strong>
          </div>
        </div>
      </header>

      <nav className="tabs">
        <button
          type="button"
          className={tab === "configure" ? "active" : ""}
          onClick={() => setTab("configure")}
        >
          需求与配置
        </button>
        <button
          type="button"
          className={tab === "live" ? "active" : ""}
          onClick={() => setTab("live")}
          disabled={!streaming && !run}
        >
          执行中
        </button>
        <button
          type="button"
          className={tab === "review" ? "active" : ""}
          onClick={() => setTab("review")}
          disabled={!run}
        >
          交付与复审
        </button>
      </nav>

      <main className="board">
        {tab === "configure" && (
          <section className="panel config-panel">
            <div className="section-head">
              <div>
                <h2>创建营销工作流</h2>
                <p>先把 brief、平台、审核边界和技能库设置完整，再启动执行。</p>
              </div>
            </div>

            <div className="form-grid large">
              <label className="field">
                <span>项目名称</span>
                <input
                  value={campaign.projectName}
                  onChange={(event) => updateCampaign("projectName", event.target.value)}
                />
              </label>
              <label className="field">
                <span>产品/服务</span>
                <input
                  value={campaign.productName}
                  onChange={(event) => updateCampaign("productName", event.target.value)}
                />
              </label>
              <label className="field full-width">
                <span>营销 brief</span>
                <textarea
                  rows={4}
                  value={campaign.brief}
                  onChange={(event) => updateCampaign("brief", event.target.value)}
                />
              </label>
              <label className="field">
                <span>核心目标</span>
                <input
                  value={campaign.objective}
                  onChange={(event) => updateCampaign("objective", event.target.value)}
                />
              </label>
              <label className="field">
                <span>目标人群</span>
                <input
                  value={campaign.targetAudience}
                  onChange={(event) => updateCampaign("targetAudience", event.target.value)}
                />
              </label>
              <label className="field">
                <span>活动窗口</span>
                <input
                  value={campaign.campaignWindow}
                  onChange={(event) => updateCampaign("campaignWindow", event.target.value)}
                />
              </label>
              <label className="field">
                <span>重点区域</span>
                <input
                  value={campaign.regionFocus}
                  onChange={(event) => updateCampaign("regionFocus", event.target.value)}
                />
              </label>
              <label className="field">
                <span>主平台</span>
                <select
                  value={campaign.primaryPlatform}
                  onChange={(event) => updateCampaign("primaryPlatform", event.target.value)}
                >
                  {setup.platforms.map((platform) => (
                    <option key={platform.id} value={platform.label}>
                      {platform.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>次级平台</span>
                <input
                  value={secondaryPlatformsInput}
                  onChange={(event) => setSecondaryPlatformsInput(event.target.value)}
                  placeholder="例如：抖音，微信生态"
                />
              </label>
              <label className="field">
                <span>品牌调性</span>
                <input
                  value={campaign.brandTone}
                  onChange={(event) => updateCampaign("brandTone", event.target.value)}
                />
              </label>
              <label className="field full-width">
                <span>核心卖点 / 证明点</span>
                <textarea
                  rows={3}
                  value={proofPointsInput}
                  onChange={(event) => setProofPointsInput(event.target.value)}
                  placeholder="每行一条，例如：零糖但口感不寡淡"
                />
              </label>
              <label className="field full-width">
                <span>结构化竞品导入</span>
                <textarea
                  rows={4}
                  value={competitorEntriesInput}
                  onChange={(event) => setCompetitorEntriesInput(event.target.value)}
                  placeholder="竞品名 | 平台 | 动作 | 信息角度 | 可攻击点"
                />
                <small>每行一条，支持 `|` 分隔或直接粘贴表格列。示例：竞品 A | 小红书 | 达人测评铺量 | 成分更轻 | 体验证据薄弱</small>
              </label>
              <div className="field full-width">
                <span>竞品文件导入</span>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleCompetitorFileImport}
                />
                <div className="actions compact-actions">
                  <button type="button" onClick={downloadCompetitorTemplate}>
                    下载导入模板
                  </button>
                </div>
                <small>{competitorImportStatus}</small>
              </div>
              {parsedCompetitorEntries.length > 0 ? (
                <div className="field full-width">
                  <span>竞品导入预览</span>
                  <small>{competitorCategorySummary}</small>
                  <div className="competitor-grid">
                    {parsedCompetitorEntries.map((entry) => (
                      <article
                        key={`${entry.competitor}-${entry.platform}-${entry.move}`}
                        className="competitor-card"
                      >
                        <div className="finding-head">
                          <strong>{entry.competitor}</strong>
                          <span>
                            {entry.platform} · {classifyCompetitorEntry(entry)}
                          </span>
                        </div>
                        <p>{entry.move}</p>
                        <p className="card-subtext">信息角度：{entry.messageAngle}</p>
                        <p className="card-subtext">可攻击点：{entry.weakness}</p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
              <label className="field full-width">
                <span>竞品观察（补充）</span>
                <textarea
                  rows={3}
                  value={competitorNotesInput}
                  onChange={(event) => setCompetitorNotesInput(event.target.value)}
                  placeholder="每行一条，例如：竞品近期主打成分故事"
                />
                <small>用于补充暂时无法结构化的信息，系统会在没有结构化条目时用它生成竞品洞察。</small>
              </label>
              <label className="field full-width">
                <span>渠道约束</span>
                <textarea
                  rows={2}
                  value={campaign.channelConstraints}
                  onChange={(event) => updateCampaign("channelConstraints", event.target.value)}
                />
              </label>
              <label className="field">
                <span>预算范围</span>
                <input
                  value={campaign.budgetRange}
                  onChange={(event) => updateCampaign("budgetRange", event.target.value)}
                />
              </label>
              <label className="field">
                <span>KPI</span>
                <input
                  value={campaign.kpis}
                  onChange={(event) => updateCampaign("kpis", event.target.value)}
                />
              </label>
              <label className="field">
                <span>输出要求</span>
                <input
                  value={campaign.deliverableSpec}
                  onChange={(event) => updateCampaign("deliverableSpec", event.target.value)}
                />
              </label>
              <label className="field full-width">
                <span>风险边界</span>
                <textarea
                  rows={3}
                  value={campaign.riskNotes}
                  onChange={(event) => updateCampaign("riskNotes", event.target.value)}
                />
              </label>
            </div>

            <div className="workflow-setup">
              <div className="panel inset">
                <h3>工作流模板</h3>
                <div className="form-grid">
                  <label className="field">
                    <span>模板</span>
                    <select
                      value={templateId}
                      onChange={(event) => setTemplateId(event.target.value as TemplateMeta["id"])}
                    >
                      {setup.templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    <small>
                      {templateId === "custom"
                        ? `自定义总预计时长：${customEstimatedSeconds}s`
                        : activeTemplate?.description}
                    </small>
                  </label>

                  <label className="field">
                    <span>默认单步骤时长（秒）</span>
                    <input
                      type="number"
                      min={20}
                      max={300}
                      value={defaultStepSeconds}
                      onChange={(event) => setDefaultStepSeconds(Number(event.target.value || 90))}
                    />
                  </label>

                  <label className="field">
                    <span>总时长上限（秒）</span>
                    <input
                      type="number"
                      min={300}
                      max={7200}
                      value={totalSeconds}
                      onChange={(event) => setTotalSeconds(Number(event.target.value || 1800))}
                    />
                  </label>
                </div>

                {activeTemplate && templateId !== "custom" && (
                  <div className="focus-row">
                    {activeTemplate.focus.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="panel inset">
                <h3>内置 Skills 包</h3>
                <div className="skill-grid">
                  {setup.skills.map((skill) => (
                    <article key={skill.id} className="skill-card">
                      <div className="skill-card-head">
                        <h4>{skill.name}</h4>
                        <span>{skill.deliverable}</span>
                      </div>
                      <p>{skill.description}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <div className="workflow-setup">
              <div className="panel inset">
                <h3>Agent Registry</h3>
                <div className="registry-grid">
                  {setup.agents.map((agent) => (
                    <article key={agent.roleId} className={`registry-card lane-${agent.lane}`}>
                      <div className="registry-head">
                        <div>
                          <p className="mini-kicker">{LANE_LABELS[agent.lane]}</p>
                          <h4>{agent.label}</h4>
                        </div>
                        <span>{agent.codename}</span>
                      </div>
                      <p>{agent.mandate}</p>
                      <p className="registry-meta">门禁范围：{agent.approvalScope}</p>
                      <div className="badge-row">
                        {agent.defaultOutputs.map((output) => (
                          <span key={output}>{output}</span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="panel inset">
                <h3>历史运行</h3>
                {historyState === "loading" ? (
                  <p className="empty-inline">正在加载历史运行...</p>
                ) : historyState === "error" ? (
                  <p className="error-text">{historyError}</p>
                ) : workflowHistory.length === 0 ? (
                  <p className="empty-inline">暂无历史运行，启动一次工作流后会出现在这里。</p>
                ) : (
                  <div className="history-list">
                    {workflowHistory.slice(0, 6).map((item) => (
                      <article key={item.id} className="history-card">
                        <div className="history-head">
                          <div>
                            <strong>{item.projectName}</strong>
                            <span>
                              {item.templateName} · {item.primaryPlatform}
                            </span>
                          </div>
                          <span>{item.launchReady ? "Ready" : "Blocked"}</span>
                        </div>
                        <p>
                          风险 {item.riskLevel} · 就绪分 {item.readinessScore} · 门禁 {item.gateBlockers}
                        </p>
                        {item.rerunOf && (
                          <p className="history-meta">
                            {rerunModeLabel(item.rerunMode)}重跑自：{item.rerunOf}
                          </p>
                        )}
                        <div className="actions compact-actions">
                          <button type="button" onClick={() => openWorkflow(item.id)}>
                            打开
                          </button>
                          <button type="button" onClick={() => rerunWorkflow(item.id)}>
                            重跑
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {templateId === "custom" && (
              <section className="custom-editor">
                <div className="custom-editor-head">
                  <div>
                    <h3>自定义营销工作流</h3>
                    <p>你可以定义环节、每步交付物以及所需角色。</p>
                  </div>
                  <button type="button" onClick={addStage}>
                    + 新增环节
                  </button>
                </div>

                <div className="custom-template-meta">
                  <label className="field compact">
                    <span>工作流名称</span>
                    <input
                      value={customTemplate.name}
                      onChange={(event) =>
                        updateCustomTemplate((current) => ({
                          ...current,
                          name: event.target.value
                        }))
                      }
                    />
                  </label>
                  <label className="field compact">
                    <span>工作流描述</span>
                    <input
                      value={customTemplate.description}
                      onChange={(event) =>
                        updateCustomTemplate((current) => ({
                          ...current,
                          description: event.target.value
                        }))
                      }
                    />
                  </label>
                </div>

                <div className="custom-stage-list">
                  {customTemplate.stages.map((stage, stageIndex) => (
                    <article key={`${stage.id}_${stageIndex}`} className="custom-stage-card">
                      <div className="custom-stage-head">
                        <h4>环节 {stageIndex + 1}</h4>
                        <div>
                          <button type="button" onClick={() => addStep(stageIndex)}>
                            + 步骤
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStage(stageIndex)}
                            disabled={customTemplate.stages.length <= 1}
                          >
                            删除环节
                          </button>
                        </div>
                      </div>

                      <div className="custom-stage-meta">
                        <label className="field compact">
                          <span>stage.id</span>
                          <input
                            value={stage.id}
                            onChange={(event) =>
                              updateStage(stageIndex, (current) => ({
                                ...current,
                                id: event.target.value
                              }))
                            }
                          />
                        </label>
                        <label className="field compact">
                          <span>环节名称</span>
                          <input
                            value={stage.name}
                            onChange={(event) =>
                              updateStage(stageIndex, (current) => ({
                                ...current,
                                name: event.target.value
                              }))
                            }
                          />
                        </label>
                        <label className="field compact">
                          <span>环节时长（秒）</span>
                          <input
                            type="number"
                            min={30}
                            max={2400}
                            value={stage.defaultStageSeconds}
                            onChange={(event) =>
                              updateStage(stageIndex, (current) => ({
                                ...current,
                                defaultStageSeconds: Number(event.target.value || 180)
                              }))
                            }
                          />
                        </label>
                        <label className="field compact full-width">
                          <span>环节说明</span>
                          <input
                            value={stage.description}
                            onChange={(event) =>
                              updateStage(stageIndex, (current) => ({
                                ...current,
                                description: event.target.value
                              }))
                            }
                          />
                        </label>
                      </div>

                      <div className="turn-editor-list">
                        {stage.steps.map((step, stepIndex) => (
                          <div key={`${step.roleId}_${stepIndex}`} className="turn-editor-item">
                            <label className="field compact">
                              <span>角色</span>
                              <select
                                value={step.roleId}
                                onChange={(event) =>
                                  updateStep(stageIndex, stepIndex, (current) => ({
                                    ...current,
                                    roleId: event.target.value as RoleId
                                  }))
                                }
                              >
                                {setup.roles.map((role) => (
                                  <option key={role.id} value={role.id}>
                                    {role.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="field compact">
                              <span>步骤目标</span>
                              <input
                                value={step.intent}
                                onChange={(event) =>
                                  updateStep(stageIndex, stepIndex, (current) => ({
                                    ...current,
                                    intent: event.target.value
                                  }))
                                }
                              />
                            </label>
                            <label className="field compact">
                              <span>交付物标题</span>
                              <input
                                value={step.outputTitle}
                                onChange={(event) =>
                                  updateStep(stageIndex, stepIndex, (current) => ({
                                    ...current,
                                    outputTitle: event.target.value
                                  }))
                                }
                              />
                            </label>
                            <label className="field compact">
                              <span>步骤时长（秒）</span>
                              <input
                                type="number"
                                min={10}
                                max={360}
                                value={step.stepSeconds ?? defaultStepSeconds}
                                onChange={(event) =>
                                  updateStep(stageIndex, stepIndex, (current) => ({
                                    ...current,
                                    stepSeconds: Number(event.target.value || defaultStepSeconds)
                                  }))
                                }
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => removeStep(stageIndex, stepIndex)}
                              disabled={stage.steps.length <= 1}
                            >
                              删除步骤
                            </button>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <h3>角色与模型配置</h3>
            <div className="role-grid">
              {[...setup.roles].sort(byRequiredFirst).map((role) => {
                const config = roleInput(role.id);
                return (
                  <article key={role.id} className={`role-card ${config.enabled ? "on" : "off"}`}>
                    <div className="role-head">
                      <div>
                        <p className="mini-kicker">{LANE_LABELS[role.lane]}</p>
                        <h4>{role.label}</h4>
                        <p>{role.description}</p>
                      </div>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={config.enabled}
                          disabled={role.required}
                          onChange={(event) => toggleRole(role.id, event.target.checked)}
                        />
                        <span>{role.required ? "必选" : config.enabled ? "已启用" : "未启用"}</span>
                      </label>
                    </div>

                    <label className="field compact">
                      <span>显示名</span>
                      <input
                        value={config.displayName}
                        onChange={(event) =>
                          updateRole(role.id, (current) => ({
                            ...current,
                            displayName: event.target.value
                          }))
                        }
                      />
                    </label>

                    <label className="field compact">
                      <span>模型模式</span>
                      <select
                        value={config.model.mode}
                        onChange={(event) =>
                          updateRole(role.id, (current) => ({
                            ...current,
                            model: {
                              ...current.model,
                              mode: event.target.value as ModelMode
                            }
                          }))
                        }
                      >
                        <option value="openai">OpenClaw / OpenAI 兼容入口</option>
                        <option value="mock">Mock（本地模拟）</option>
                      </select>
                    </label>

                    {config.model.mode !== "mock" && (
                      <div className="api-config">
                        <p className="model-helper">{providerHint(config.model.mode).helper}</p>
                        <label className="field compact">
                          <span>Base URL</span>
                          <input
                            placeholder={providerHint(config.model.mode).baseUrlPlaceholder}
                            value={config.model.baseUrl}
                            onChange={(event) =>
                              updateRole(role.id, (current) => ({
                                ...current,
                                model: {
                                  ...current.model,
                                  baseUrl: event.target.value
                                }
                              }))
                            }
                          />
                        </label>
                        <label className="field compact">
                          <span>API Key</span>
                          <input
                            type="password"
                            placeholder="sk-..."
                            value={config.model.apiKey}
                            onChange={(event) =>
                              updateRole(role.id, (current) => ({
                                ...current,
                                model: {
                                  ...current.model,
                                  apiKey: event.target.value
                                }
                              }))
                            }
                          />
                        </label>
                        <label className="field compact">
                          <span>Model</span>
                          <input
                            placeholder={providerHint(config.model.mode).modelPlaceholder}
                            value={config.model.model}
                            onChange={(event) =>
                              updateRole(role.id, (current) => ({
                                ...current,
                                model: {
                                  ...current.model,
                                  model: event.target.value
                                }
                              }))
                            }
                          />
                        </label>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <div className="panel inset top-gap">
              <h3>团队编制预览</h3>
              <div className="team-grid">
                {enabledRoles.map((member) => {
                  const roleInfo = roleDictionary.get(member.roleId);
                  return (
                    <article key={member.roleId} className={`team-card lane-${roleInfo?.lane ?? "operations"}`}>
                      <div className="team-card-head">
                        <div>
                          <p className="mini-kicker">{LANE_LABELS[roleInfo?.lane ?? "operations"]}</p>
                          <strong>{member.displayName}</strong>
                        </div>
                        <span>{skillCountByRole.get(member.roleId) ?? 0} skills</span>
                      </div>
                      <p>{roleInfo?.description ?? "未定义职责"}</p>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="actions">
              <button
                type="button"
                className="primary"
                onClick={launchWorkflow}
                disabled={runState === "loading" || streaming}
              >
                {streaming ? "营销工作流执行中..." : runState === "loading" ? "连接中..." : "启动营销工作流"}
              </button>
              {runError && <span className="error-text">{runError}</span>}
            </div>
          </section>
        )}

        {tab === "live" && (
          <section className="panel live-panel">
            {!streaming && !run ? (
              <div className="empty-state">启动工作流后，这里会展示阶段推进、实时产物和审核状态。</div>
            ) : (
              <>
                <div className="live-header">
                  <div>
                    <h2>{liveMeta?.projectName ?? run?.campaign.projectName ?? "执行中"}</h2>
                    <p>
                      {streaming
                        ? `当前阶段：${streamCurrentStageName}`
                        : `已完成模板：${run?.templateName ?? "-"}`}
                    </p>
                  </div>
                  <div className="live-controls">
                    {streaming && <span className="streaming-pill">Workflow Live</span>}
                    <button type="button" onClick={() => setTab("review")} disabled={!run}>
                      查看交付
                    </button>
                  </div>
                </div>

                <div className="progress-wrap stream-progress">
                  <div className="stream-meter">
                    <div style={{ width: `${liveProgress}%` }} />
                  </div>
                  <span>{liveProgress}%</span>
                </div>

                <div className="board-metrics">
                  <article className="summary-card">
                    <span>已完成步骤</span>
                    <strong>{streaming ? displayedSteps.length : run?.board.completedSteps ?? 0}</strong>
                    <p>当前已经产出的步骤数量。</p>
                  </article>
                  <article className="summary-card">
                    <span>已完成阶段</span>
                    <strong>{streaming ? displayedStages.length : run?.board.completedStages ?? 0}</strong>
                    <p>已推进完成的流程阶段。</p>
                  </article>
                  <article className="summary-card">
                    <span>资产数量</span>
                    <strong>{run?.board.outputCount ?? displayedSteps.length}</strong>
                    <p>已形成的交付物或审校结果。</p>
                  </article>
                  <article className="summary-card">
                    <span>阻塞门禁</span>
                    <strong>{run?.board.gateBlockers ?? 0}</strong>
                    <p>品牌或合规尚未通过时，这里会显示阻塞数。</p>
                  </article>
                </div>

                <div className="stage-line">
                  {(templateId === "custom"
                    ? customTemplate.stages.map((stage) => ({
                        id: stage.id,
                        name: stage.name,
                        description: stage.description
                      }))
                    : run?.stages ?? displayedStages
                  ).map((stage) => (
                    <article key={stage.id} className={stageStatus(stage.id)}>
                      <strong>{stage.name}</strong>
                      <p>{stage.description}</p>
                    </article>
                  ))}
                </div>

                {currentStep && (
                  <div className={`active-turn lane-${currentStep.lane}`}>
                    <div className="meta">
                      {currentStep.roleName} · {currentStep.outputTitle}
                    </div>
                    <h3>{currentStep.intent}</h3>
                    <p>{currentStep.content}</p>
                    {currentStep.skillsUsed.length > 0 && (
                      <div className="badge-row">
                        {currentStep.skillsUsed.map((skillId) => (
                          <span key={skillId}>{skillId}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {run?.gates && run.gates.length > 0 && !streaming && (
                  <div className="gate-grid">
                    {run.gates.map((gate) => (
                      <article
                        key={gate.id}
                        className={`gate-card ${gate.blocking ? "blocking" : "passed"}`}
                      >
                        <div className="gate-card-head">
                          <strong>{gate.label}</strong>
                          <span>{gate.status}</span>
                        </div>
                        <p>{gate.summary}</p>
                      </article>
                    ))}
                  </div>
                )}

                <div className="transcript-list">
                  {displayedSteps.map((step) => (
                    <article key={step.id} className={`turn lane-${step.lane}`}>
                      <div className="turn-head">
                        <div>
                          <strong>{step.outputTitle}</strong>
                          <span>
                            {step.roleName} · {step.stageName}
                          </span>
                        </div>
                        <small>{formatClock(step.endedAtSecond)}</small>
                      </div>
                      <p>{step.content}</p>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {tab === "review" && (
          <section className="panel review-panel">
            {!run ? (
              <div className="empty-state">工作流完成后，这里会输出交付资产、风险和下一步动作。</div>
            ) : (
              <>
                <div className="review-head">
                  <div>
                    <h2>{run.campaign.projectName}</h2>
                    <p>
                      {run.templateName} · {run.campaign.primaryPlatform} · 就绪分 {run.review.readinessScore}
                    </p>
                  </div>
                  <div className="actions">
                    <button type="button" onClick={() => rerunWorkflow(run.id)}>
                      基于本次重跑
                    </button>
                    <button type="button" onClick={() => openExport("markdown")}>
                      导出 Markdown
                    </button>
                    <button type="button" onClick={() => openExport("pdf-summary")}>
                      导出摘要 PDF
                    </button>
                    <button type="button" onClick={() => openExport("json")}>
                      导出 JSON
                    </button>
                  </div>
                </div>

                <div className="summary-grid">
                  <article className="summary-card accent">
                    <span>风险等级</span>
                    <strong>{run.review.riskLevel}</strong>
                    <p>{run.review.overallVerdict}</p>
                  </article>
                  <article className="summary-card">
                    <span>审批阶段</span>
                    <strong>{approvalPhaseLabel(run.approval.currentPhase)}</strong>
                    <p>
                      {run.approval.launchReady
                        ? "品牌和合规门禁均已通过。"
                        : "当前仍存在门禁阻塞，建议先完成修改后再上线。"}
                    </p>
                  </article>
                  <article className="summary-card">
                    <span>品牌审校</span>
                    <strong>{run.review.brandStatus}</strong>
                    <p>品牌表达、调性统一性和人群匹配度。</p>
                  </article>
                  <article className="summary-card">
                    <span>合规审查</span>
                    <strong>{run.review.complianceStatus}</strong>
                    <p>广告法、平台规则和高风险表述检查。</p>
                  </article>
                  <article className="summary-card">
                    <span>资产总数</span>
                    <strong>{run.board.outputCount}</strong>
                    <p>{run.board.recommendedFocus}</p>
                  </article>
                </div>

                {run.rerunOf && (
                  <div className="panel inset top-gap">
                    <h3>运行链路</h3>
                    <p className="lead-paragraph">
                      当前结果是基于 <code>{run.rerunOf}</code> 的{rerunModeLabel(run.rerunContext.mode)}重跑版本。{run.rerunContext.note}
                    </p>
                  </div>
                )}

                <div className="board-metrics">
                  <article className="summary-card">
                    <span>总步骤</span>
                    <strong>{run.board.totalSteps}</strong>
                    <p>当前模板在启用角色下需要推进的总步骤。</p>
                  </article>
                  <article className="summary-card">
                    <span>已完成步骤</span>
                    <strong>{run.board.completedSteps}</strong>
                    <p>当前已产出的步骤数量。</p>
                  </article>
                  <article className="summary-card">
                    <span>已完成阶段</span>
                    <strong>{run.board.completedStages}</strong>
                    <p>当前 workflow 的阶段完成度。</p>
                  </article>
                  <article className="summary-card">
                    <span>阻塞门禁</span>
                    <strong>{run.board.gateBlockers}</strong>
                    <p>门禁未过时，建议先修正相关素材再上线。</p>
                  </article>
                </div>

                <div className="panel inset top-gap">
                  <h3>审核门禁</h3>
                  <div className="gate-grid">
                    {run.gates.map((gate) => (
                      <article
                        key={gate.id}
                        className={`gate-card ${gate.blocking ? "blocking" : "passed"}`}
                      >
                        <div className="gate-card-head">
                          <div>
                            <p className="mini-kicker">{gate.ownerRoleId}</p>
                            <strong>{gate.label}</strong>
                          </div>
                          <span>{gate.status}</span>
                        </div>
                        <p>{gate.summary}</p>
                        {gate.relatedFindings.length > 0 && (
                          <ul>
                            {gate.relatedFindings.map((finding) => (
                              <li key={`${gate.id}-${finding.title}`}>{finding.title}</li>
                            ))}
                          </ul>
                        )}
                        <div className="actions compact-actions">
                          <button
                            type="button"
                            onClick={() =>
                              rerunWorkflowFromTarget(run.id, { roleId: gate.ownerRoleId })
                            }
                          >
                            从此门禁重跑
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="review-columns">
                  <div className="panel inset">
                    <h3>策略与洞察</h3>
                    <p className="lead-paragraph">{run.deliverables.strategySummary}</p>
                    <ul>
                      {run.deliverables.audienceInsights.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="panel inset">
                    <h3>审核与修改项</h3>
                    <div className="finding-list">
                      {run.review.findings.map((finding) => (
                        <article key={`${finding.title}-${finding.ownerRoleId}`} className="finding-card">
                          <div className="finding-head">
                            <strong>{finding.title}</strong>
                            <span>{finding.severity}</span>
                          </div>
                          <p>{finding.detail}</p>
                        </article>
                      ))}
                    </div>
                    <ul>
                      {run.review.nextActions.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="review-columns">
                  <div className="panel inset">
                    <h3>竞品洞察</h3>
                    <div className="finding-list">
                      {run.deliverables.competitorInsights.map((item) => (
                        <article key={`${item.competitor}-${item.move}`} className="finding-card">
                          <div className="finding-head">
                            <strong>{item.competitor}</strong>
                            <span>{item.category}</span>
                          </div>
                          <p>{item.move}</p>
                          <p className="card-subtext">影响：{item.implication}</p>
                          <p className="card-subtext">应对：{item.response}</p>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="panel inset">
                    <h3>平台打法卡</h3>
                    <div className="asset-list">
                      {run.deliverables.platformPlaybooks.map((item) => (
                        <article key={item.platform} className="asset-card">
                          <div className="asset-head">
                            <strong>{item.platform}</strong>
                            <span>Platform Playbook</span>
                          </div>
                          <p>{item.positioning}</p>
                          <p className="mini-kicker top-gap">内容支柱</p>
                          <ul>
                            {item.contentPillars.map((pillar) => (
                              <li key={`${item.platform}-${pillar}`}>{pillar}</li>
                            ))}
                          </ul>
                          <p className="mini-kicker top-gap">分发动作</p>
                          <ul>
                            {item.distributionMoves.map((move) => (
                              <li key={`${item.platform}-${move}`}>{move}</li>
                            ))}
                          </ul>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="review-columns">
                  <div className="panel inset">
                    <div className="section-head">
                      <div>
                        <h3>平台专用资产卡</h3>
                        <p>按平台拆出的可执行文档，可单独导出给内容、渠道或代理商团队。</p>
                      </div>
                      <div className="actions compact-actions">
                        <button
                          type="button"
                          onClick={() => openExport("platform-assets-markdown")}
                        >
                          导出资产 MD
                        </button>
                        <button
                          type="button"
                          onClick={() => openExport("platform-assets-pdf")}
                        >
                          导出资产 PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => openExport("platform-assets-json")}
                        >
                          导出资产 JSON
                        </button>
                      </div>
                    </div>
                    <div className="asset-list">
                      {(run.deliverables.platformAssets ?? []).map((asset) => (
                        <article
                          key={`${asset.platform}-${asset.assetType}`}
                          className="asset-card"
                        >
                          <div className="asset-head">
                            <strong>{asset.title}</strong>
                            <span>{PLATFORM_ASSET_LABELS[asset.assetType]}</span>
                          </div>
                          <p>{asset.hook}</p>
                          <p className="mini-kicker top-gap">结构</p>
                          <ul>
                            {asset.structure.map((item) => (
                              <li key={`${asset.platform}-${item}`}>{item}</li>
                            ))}
                          </ul>
                          <p className="card-subtext top-gap">CTA：{asset.cta}</p>
                          <p className="card-subtext">备注：{asset.notes}</p>
                          <div className="actions compact-actions">
                            <button
                              type="button"
                              onClick={() =>
                                openExport("platform-asset-onepager-markdown", asset.platform)
                              }
                            >
                              单页 MD
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                openExport("platform-asset-onepager-pdf", asset.platform)
                              }
                            >
                              单页 PDF
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="panel inset">
                    <h3>资产看板</h3>
                    <div className="asset-list">
                      {run.artifacts.map((artifact) => (
                        <article
                          key={artifact.id}
                          className={`asset-card artifact-${artifact.status} lane-${run.team.find((member) => member.roleId === artifact.ownerRoleId)?.lane ?? "operations"}`}
                        >
                          <div className="asset-head">
                            <div>
                              <strong>{artifact.title}</strong>
                              <span>
                                {ARTIFACT_KIND_LABELS[artifact.kind]} · {artifact.ownerRoleName} · {artifact.platform}
                              </span>
                            </div>
                            <span>{ARTIFACT_STATUS_LABELS[artifact.status]}</span>
                          </div>
                          <p>{artifact.summary}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="review-columns">
                  <div className="panel inset">
                    <h3>渠道动作与监测</h3>
                    <p className="mini-kicker">渠道动作</p>
                    <ul>
                      {run.deliverables.channelActions.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <p className="mini-kicker top-gap">监测计划</p>
                    <ul>
                      {run.deliverables.measurementPlan.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <p className="mini-kicker top-gap">内容矩阵</p>
                    <div className="matrix-list">
                      {run.deliverables.contentMatrix.map((item) => (
                        <article key={`${item.platform}-${item.angle}`} className="matrix-card">
                          <strong>{item.platform}</strong>
                          <p>{item.angle}</p>
                          <p className="card-subtext">形式：{item.format}</p>
                          <p className="card-subtext">钩子：{item.hook}</p>
                          <p className="card-subtext">CTA：{item.cta}</p>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="panel inset">
                    <h3>内容资产</h3>
                    <div className="asset-list">
                      {run.deliverables.contentAssets.map((asset) => (
                        <article key={`${asset.title}-${asset.platform}`} className="asset-card">
                          <div className="asset-head">
                            <strong>{asset.title}</strong>
                            <span>{asset.platform}</span>
                          </div>
                          <p>{asset.summary}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="panel inset top-gap">
                  <h3>团队编制</h3>
                  <div className="team-grid">
                    {run.team
                      .filter((member) => member.enabled)
                      .map((member) => (
                        <article
                          key={member.roleId}
                          className={`team-card lane-${member.lane}`}
                        >
                          <div className="team-card-head">
                            <div>
                              <p className="mini-kicker">{LANE_LABELS[member.lane]}</p>
                              <strong>{member.displayName}</strong>
                            </div>
                            <span>{member.skillCount} skills</span>
                          </div>
                          <p>{member.responsibility}</p>
                          <div className="actions compact-actions">
                            <button
                              type="button"
                              onClick={() =>
                                rerunWorkflowFromTarget(run.id, { roleId: member.roleId })
                              }
                            >
                              从该角色重跑
                            </button>
                          </div>
                        </article>
                      ))}
                  </div>
                </div>

                <div className="panel inset">
                  <h3>知识沉淀与运行提示</h3>
                  <ul>
                    {run.deliverables.knowledgeCards.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  {run.warnings.length > 0 && (
                    <>
                      <p className="mini-kicker top-gap">运行提示</p>
                      <ul>
                        {run.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
