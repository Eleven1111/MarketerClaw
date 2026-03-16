export type RoleId =
  | "briefDesk"
  | "strategyLead"
  | "contentPlanner"
  | "channelOperator"
  | "brandReviewer"
  | "complianceGuard"
  | "dataAnalyst"
  | "martechOperator"
  | "knowledgeManager";

export type RoleLane =
  | "intake"
  | "strategy"
  | "production"
  | "distribution"
  | "review"
  | "operations";

export type TemplateId =
  | "launch_cn"
  | "promotion_cn"
  | "content_matrix_cn"
  | "weekly_report_cn"
  | "custom";

export type ModelMode = "mock" | "openai" | "google" | "volcengine";

export type RoleDefinition = {
  id: RoleId;
  label: string;
  required: boolean;
  lane: RoleLane;
  description: string;
  defaultPrompt: string;
};

export type SkillDefinition = {
  id: string;
  name: string;
  description: string;
  deliverable: string;
  appliesTo: RoleId[];
};

export type AgentRegistryEntry = {
  roleId: RoleId;
  codename: string;
  label: string;
  lane: RoleLane;
  mandate: string;
  approvalScope: string;
  defaultOutputs: string[];
  defaultSkillIds: string[];
};

export type PlatformOption = {
  id: string;
  label: string;
  description: string;
};

export type TemplateMeta = {
  id: TemplateId;
  name: string;
  description: string;
  stageCount: number;
  estimatedSeconds: number;
  focus: string[];
};

export type SetupResponse = {
  roles: RoleDefinition[];
  agents: AgentRegistryEntry[];
  templates: TemplateMeta[];
  skills: SkillDefinition[];
  platforms: PlatformOption[];
  defaults: {
    templateId: TemplateId;
    workflowControl: {
      defaultStepSeconds: number;
      totalSeconds: number;
    };
  };
};

export type RoleModelConfig = {
  mode: ModelMode;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  systemPrompt?: string;
};

export type ConfiguredRole = {
  roleId: RoleId;
  enabled: boolean;
  displayName: string;
  model: RoleModelConfig;
};

export type CampaignContext = {
  projectName: string;
  productName: string;
  brief: string;
  objective: string;
  targetAudience: string;
  primaryPlatform: string;
  secondaryPlatforms: string[];
  campaignWindow: string;
  regionFocus: string;
  brandTone: string;
  productProofPoints: string[];
  competitorNotes: string[];
  competitorEntries: Array<{
    competitor: string;
    platform: string;
    move: string;
    messageAngle: string;
    weakness: string;
  }>;
  channelConstraints: string;
  budgetRange: string;
  kpis: string;
  riskNotes: string;
  deliverableSpec: string;
};

export type WorkflowControlSettings = {
  defaultStepSeconds: number;
  totalSeconds: number;
  stageSeconds: Record<string, number>;
  roleStepSeconds: Partial<Record<RoleId, number>>;
};

export type CustomWorkflowTemplate = {
  name: string;
  description: string;
  stages: Array<{
    id: string;
    name: string;
    description: string;
    defaultStageSeconds: number;
    steps: Array<{
      roleId: RoleId;
      intent: string;
      outputTitle: string;
      skillIds?: string[];
      stepSeconds?: number;
    }>;
  }>;
};

export type WorkflowCreatePayload = {
  campaign: CampaignContext;
  templateId: TemplateId;
  customTemplate?: CustomWorkflowTemplate;
  roles: ConfiguredRole[];
  workflowControl: WorkflowControlSettings;
};

export type WorkflowStep = {
  id: string;
  sequence: number;
  stageId: string;
  stageName: string;
  roleId: RoleId;
  roleName: string;
  lane: RoleLane;
  intent: string;
  outputTitle: string;
  skillsUsed: string[];
  allocatedSeconds: number;
  estimatedSeconds: number;
  overtimeSeconds: number;
  wasTruncated: boolean;
  startedAtSecond: number;
  endedAtSecond: number;
  content: string;
  source: "api" | "mock" | "fallback";
  model: string;
  error?: string;
};

export type WorkflowStage = {
  id: string;
  name: string;
  description: string;
  allocatedSeconds: number;
  actualSeconds: number;
  overtimeSeconds: number;
  steps: WorkflowStep[];
};

export type ReviewFinding = {
  title: string;
  severity: "高" | "中" | "低";
  detail: string;
  ownerRoleId: RoleId;
};

export type ReviewSummary = {
  readinessScore: number;
  riskLevel: "低" | "中" | "高";
  brandStatus: "通过" | "需修改";
  complianceStatus: "通过" | "需修改";
  overallVerdict: string;
  highlights: string[];
  findings: ReviewFinding[];
  nextActions: string[];
};

export type ReviewGate = {
  id: "brand_gate" | "compliance_gate";
  label: string;
  ownerRoleId: RoleId;
  status: "通过" | "需修改";
  blocking: boolean;
  summary: string;
  relatedFindings: ReviewFinding[];
};

export type ApprovalState = {
  currentPhase:
    | "drafting"
    | "brand_review"
    | "compliance_review"
    | "ready_to_launch"
    | "blocked";
  launchReady: boolean;
  blockingGateIds: Array<ReviewGate["id"]>;
  rerunRecommended: boolean;
  history: Array<{
    gateId: ReviewGate["id"];
    label: string;
    ownerRoleId: RoleId;
    status: ReviewGate["status"];
    blocking: boolean;
    summary: string;
  }>;
};

export type RerunContext = {
  mode: "full" | "stage" | "role";
  sourceWorkflowId: string | null;
  startStageId?: string;
  startRoleId?: RoleId;
  note: string;
};

export type ContentAsset = {
  title: string;
  platform: string;
  summary: string;
  ownerRoleId: RoleId;
};

export type ContentMatrixEntry = {
  platform: string;
  angle: string;
  format: string;
  hook: string;
  cta: string;
};

export type PlatformPlaybook = {
  platform: string;
  positioning: string;
  contentPillars: string[];
  distributionMoves: string[];
  measurementFocus: string[];
};

export type PlatformAsset = {
  platform: string;
  assetType:
    | "xiaohongshu_note"
    | "douyin_script"
    | "wechat_article"
    | "generic_asset";
  title: string;
  hook: string;
  structure: string[];
  cta: string;
  notes: string;
};

export type CompetitorInsight = {
  competitor: string;
  category: string;
  move: string;
  implication: string;
  response: string;
};

export type WorkflowArtifact = {
  id: string;
  title: string;
  kind: "brief" | "strategy" | "content" | "channel" | "review" | "ops";
  status: "draft" | "approved" | "needs_changes";
  platform: string;
  stageId: string;
  stageName: string;
  ownerRoleId: RoleId;
  ownerRoleName: string;
  summary: string;
  skillsUsed: string[];
};

export type TeamSnapshot = {
  roleId: RoleId;
  displayName: string;
  lane: RoleLane;
  enabled: boolean;
  responsibility: string;
  skillCount: number;
};

export type WorkboardSummary = {
  totalSteps: number;
  completedSteps: number;
  completedStages: number;
  gateBlockers: number;
  activeLanes: RoleLane[];
  outputCount: number;
  recommendedFocus: string;
};

export type Deliverables = {
  strategySummary: string;
  audienceInsights: string[];
  competitorInsights: CompetitorInsight[];
  platformPlaybooks: PlatformPlaybook[];
  platformAssets: PlatformAsset[];
  contentMatrix: ContentMatrixEntry[];
  contentAssets: ContentAsset[];
  channelActions: string[];
  measurementPlan: string[];
  knowledgeCards: string[];
};

export type WorkflowRun = {
  id: string;
  createdAt: string;
  rerunOf: string | null;
  rerunContext: RerunContext;
  campaign: CampaignContext;
  templateId: TemplateId;
  templateName: string;
  workflowControl: WorkflowControlSettings;
  roles: ConfiguredRole[];
  team: TeamSnapshot[];
  stages: WorkflowStage[];
  timeline: WorkflowStep[];
  artifacts: WorkflowArtifact[];
  gates: ReviewGate[];
  approval: ApprovalState;
  board: WorkboardSummary;
  review: ReviewSummary;
  deliverables: Deliverables;
  totalAllocatedSeconds: number;
  totalActualSeconds: number;
  totalOvertimeSeconds: number;
  warnings: string[];
};

export type WorkflowListItem = {
  id: string;
  createdAt: string;
  rerunOf: string | null;
  rerunMode: RerunContext["mode"];
  projectName: string;
  templateName: string;
  primaryPlatform: string;
  readinessScore: number;
  riskLevel: ReviewSummary["riskLevel"];
  gateBlockers: number;
  outputCount: number;
  launchReady: boolean;
};

export type WorkflowMeta = {
  id: string;
  createdAt: string;
  projectName: string;
  templateId: TemplateId;
  templateName: string;
  objective: string;
  primaryPlatform: string;
};

export type WorkflowStreamEvent =
  | { type: "meta"; payload: WorkflowMeta }
  | {
      type: "stage_start";
      payload: {
        id: string;
        name: string;
        description: string;
        allocatedSeconds: number;
      };
    }
  | { type: "step"; payload: WorkflowStep }
  | { type: "stage_end"; payload: WorkflowStage }
  | { type: "done"; payload: WorkflowRun }
  | { type: "error"; payload: { message: string } };
