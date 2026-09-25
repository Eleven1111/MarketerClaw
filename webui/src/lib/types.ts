// ── Workflow ──

export type StepStatus = "done" | "running" | "pending" | "error";

export type Tier = "A" | "B" | "C";

export interface WorkflowStep {
  /** Equals the `--step` value setup.mjs / finalize.mjs record in .status.json. */
  id: string;
  name: string;
  nameCn: string;
  file: string;
  skill: string;
  /** mc-orchestrate tier that first includes this step; null = not in orchestrate. */
  tier: Tier | null;
  /** Part of the manual mc-campaign flow (brief → strategy → content → channel → review). */
  manual?: boolean;
  /** Conditional step (may be skipped by project type / missing competitors). */
  optional?: boolean;
}

// Order and ids mirror mc-orchestrate's dependency tables (Step 1-20) plus the
// two manual-only mc-campaign steps (brief, channel).
export const WORKFLOW_STEPS: WorkflowStep[] = [
  { id: "brief", name: "Brief", nameCn: "需求分诊", file: "brief.md", skill: "mc-campaign", tier: null, manual: true },
  { id: "brand", name: "Brand", nameCn: "品牌策略", file: "brand.md", skill: "mc-brand", tier: "A" },
  { id: "compete", name: "Compete", nameCn: "竞品情报", file: "compete.md", skill: "mc-compete", tier: "A", optional: true },
  { id: "storyteller", name: "Storyteller", nameCn: "叙事体系", file: "storyteller.md", skill: "mc-storyteller", tier: "A" },
  { id: "insight", name: "Insight", nameCn: "文化洞察", file: "insight.md", skill: "mc-insight", tier: "A" },
  { id: "research", name: "Research", nameCn: "市场调研", file: "research.md", skill: "mc-research", tier: "A" },
  { id: "selection", name: "Selection", nameCn: "选品", file: "selection.md", skill: "mc-selection", tier: "B", optional: true },
  { id: "strategy", name: "Strategy", nameCn: "策略规划", file: "strategy.md", skill: "mc-campaign", tier: "B", manual: true },
  { id: "content", name: "Content", nameCn: "内容生产", file: "content/", skill: "mc-content", tier: "B", manual: true },
  { id: "kol", name: "KOL", nameCn: "达人策略", file: "kol.md", skill: "mc-kol", tier: "B" },
  { id: "copy", name: "Copy", nameCn: "文案", file: "copy.md", skill: "mc-copy", tier: "B" },
  { id: "channel", name: "Channel", nameCn: "渠道排布", file: "channel.md", skill: "mc-campaign", tier: null, manual: true },
  { id: "seo", name: "SEO", nameCn: "SEO", file: "seo.md", skill: "mc-seo", tier: "C" },
  { id: "geo", name: "GEO", nameCn: "GEO 优化", file: "geo.md", skill: "mc-geo", tier: "C" },
  { id: "community", name: "Community", nameCn: "私域社群", file: "community.md", skill: "mc-community", tier: "C" },
  { id: "automation", name: "Automation", nameCn: "营销自动化", file: "automation.md", skill: "mc-automation", tier: "C" },
  { id: "livestream", name: "Livestream", nameCn: "直播运营", file: "livestream.md", skill: "mc-livestream", tier: "C", optional: true },
  { id: "aigc", name: "AIGC", nameCn: "AIGC 素材", file: "aigc.md", skill: "mc-aigc", tier: "C" },
  { id: "dtc", name: "DTC", nameCn: "独立站蓝图", file: "dtc.md", skill: "mc-dtc", tier: "C", optional: true },
  { id: "review", name: "Review", nameCn: "品牌+合规审核", file: "review.md", skill: "mc-review", tier: "C", manual: true },
  { id: "analytics", name: "Analytics", nameCn: "数据分析", file: "analytics.md", skill: "mc-analytics", tier: "C" },
  { id: "report", name: "Report", nameCn: "复盘报告", file: "report.md", skill: "mc-report", tier: "C" },
];

// ── Campaign ──

export interface CampaignMeta {
  slug: string;
  name: string;
  updatedAt: string;
  steps: Record<string, StepStatus>;
  platforms: string[];
  activeSkill?: string;
}

export interface CampaignDetail extends CampaignMeta {
  files: CampaignFile[];
}

export interface CampaignFile {
  name: string;
  path: string;
  stepId: string;
  size: number;
  updatedAt: string;
}

// ── Agent ──

export interface AgentStatus {
  campaignSlug: string | null;
  currentSkill: string | null;
  currentStep: string | null;
  status: "idle" | "running" | "done" | "error";
  log: AgentLogEntry[];
}

export interface AgentLogEntry {
  time: string;
  level: "info" | "step" | "warn" | "error" | "done";
  message: string;
}

// ── Chat ──

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  skill?: string;
}

// ── Skills ──

export interface SkillInfo {
  id: string;
  name: string;
  description: string;
  standalone: boolean;
}

// Every skill under skills/, in workflow order. tests/webui-skills.test.mjs
// fails when a skill is added or removed without updating this list.
export const SKILLS: SkillInfo[] = [
  { id: "mc-cmo", name: "CMO", description: "判断请求、路由到技能", standalone: true },
  { id: "mc-orchestrate", name: "Orchestrate", description: "全链路自主执行", standalone: true },
  { id: "mc-campaign", name: "Campaign", description: "全流程作战编排", standalone: true },
  { id: "mc-brand", name: "Brand", description: "品牌策略与定位", standalone: true },
  { id: "mc-storyteller", name: "Storyteller", description: "品牌叙事体系", standalone: true },
  { id: "mc-insight", name: "Insight", description: "文化与人群洞察", standalone: true },
  { id: "mc-research", name: "Research", description: "市场调研", standalone: true },
  { id: "mc-compete", name: "Compete", description: "竞品情报分析", standalone: true },
  { id: "mc-monitor", name: "Monitor", description: "竞品实时监控", standalone: true },
  { id: "mc-selection", name: "Selection", description: "选品", standalone: true },
  { id: "mc-product", name: "Product", description: "造品与产品定义", standalone: true },
  { id: "mc-content", name: "Content", description: "单平台内容生产", standalone: true },
  { id: "mc-copy", name: "Copy", description: "文案写作", standalone: true },
  { id: "mc-poster", name: "Poster", description: "商业海报设计指导", standalone: true },
  { id: "mc-aigc", name: "AIGC", description: "AI 图片与视频素材", standalone: true },
  { id: "mc-kol", name: "KOL", description: "达人营销策略", standalone: true },
  { id: "mc-livestream", name: "Livestream", description: "直播运营", standalone: true },
  { id: "mc-seo", name: "SEO", description: "搜索引擎优化", standalone: true },
  { id: "mc-geo", name: "GEO", description: "AI 搜索引擎优化", standalone: true },
  { id: "mc-community", name: "Community", description: "私域与社群运营", standalone: true },
  { id: "mc-automation", name: "Automation", description: "营销自动化", standalone: true },
  { id: "mc-retain", name: "Retain", description: "客户留存与复购", standalone: true },
  { id: "mc-dtc", name: "DTC", description: "海外独立站全栈蓝图", standalone: true },
  { id: "mc-analytics", name: "Analytics", description: "数据分析与诊断", standalone: true },
  { id: "mc-dashboard", name: "Dashboard", description: "健康度看板与异常预警", standalone: true },
  { id: "mc-diagnose", name: "Diagnose", description: "营销全链路诊断", standalone: true },
  { id: "mc-report", name: "Report", description: "Campaign 复盘与周报", standalone: true },
  { id: "mc-review", name: "Review", description: "品牌调性+合规双审", standalone: true },
  { id: "mc-memory", name: "Memory", description: "品牌记忆读写", standalone: true },
];
