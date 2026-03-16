export const REQUIRED_ROLE_IDS = [
  "briefDesk",
  "strategyLead",
  "contentPlanner",
  "channelOperator",
  "brandReviewer",
  "complianceGuard"
] as const;

export const OPTIONAL_ROLE_IDS = [
  "dataAnalyst",
  "martechOperator",
  "knowledgeManager"
] as const;

export const ROLE_IDS = [...REQUIRED_ROLE_IDS, ...OPTIONAL_ROLE_IDS] as const;

export type RoleId = (typeof ROLE_IDS)[number];

export type RoleLane =
  | "intake"
  | "strategy"
  | "production"
  | "distribution"
  | "review"
  | "operations";

export type RoleDefinition = {
  id: RoleId;
  label: string;
  required: boolean;
  lane: RoleLane;
  description: string;
  defaultPrompt: string;
};

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: "briefDesk",
    label: "需求分诊台",
    required: true,
    lane: "intake",
    description: "把业务需求整理成可执行营销 brief，并指出缺口。",
    defaultPrompt:
      "你是中国市场团队的需求分诊负责人。你的任务是把业务输入整理成清晰的营销 brief，明确目标、约束、交付物和待补充信息。"
  },
  {
    id: "strategyLead",
    label: "策略负责人",
    required: true,
    lane: "strategy",
    description: "输出传播策略、叙事框架和阶段重点。",
    defaultPrompt:
      "你是营销策略负责人。请围绕中国市场环境，输出可执行的传播策略、核心信息屋和阶段打法，避免空洞口号。"
  },
  {
    id: "contentPlanner",
    label: "内容策划",
    required: true,
    lane: "production",
    description: "产出选题、脚本、内容矩阵和文案方向。",
    defaultPrompt:
      "你是内容策划。请结合平台语境，产出内容矩阵、脚本角度和文案框架，强调传播钩子、话题性和可发布性。"
  },
  {
    id: "channelOperator",
    label: "渠道投放",
    required: true,
    lane: "distribution",
    description: "负责平台适配、节奏安排和执行动作。",
    defaultPrompt:
      "你是渠道与投放执行负责人。请按平台机制给出执行节奏、素材搭配和投放动作，优先考虑中国主流平台的实际运营习惯。"
  },
  {
    id: "brandReviewer",
    label: "品牌审校",
    required: true,
    lane: "review",
    description: "检查品牌调性、一致性和表达边界。",
    defaultPrompt:
      "你是品牌审校负责人。请检查方案是否符合品牌调性、表达一致性和人群感知，必要时明确指出需要修改的位置。"
  },
  {
    id: "complianceGuard",
    label: "合规审查",
    required: true,
    lane: "review",
    description: "检查广告法、平台规则和敏感表达风险。",
    defaultPrompt:
      "你是合规审查负责人。请基于中国广告法和平台规则识别高风险表述、功效承诺、绝对化用语和可能触发限流的内容。"
  },
  {
    id: "dataAnalyst",
    label: "数据分析",
    required: false,
    lane: "strategy",
    description: "输出 KPI、预算建议和复盘指标。",
    defaultPrompt:
      "你是数据分析师。请用营销指标语言给出预算分配建议、核心 KPI、监测方式和优化信号。"
  },
  {
    id: "martechOperator",
    label: "营销自动化",
    required: false,
    lane: "operations",
    description: "负责表单、归因、自动化链路和协作配置。",
    defaultPrompt:
      "你是营销技术运营负责人。请提出表单、自动化、数据归因和协作工具上的配置建议，确保项目可执行。"
  },
  {
    id: "knowledgeManager",
    label: "知识运营",
    required: false,
    lane: "operations",
    description: "沉淀模板、案例库和复盘卡片。",
    defaultPrompt:
      "你是知识运营负责人。请把可复用的方法、模板、风险和案例沉淀成团队资产，方便后续 campaign 复用。"
  }
];

export const TEMPLATE_IDS = [
  "launch_cn",
  "promotion_cn",
  "content_matrix_cn",
  "weekly_report_cn",
  "custom"
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export type StepPlan = {
  roleId: RoleId;
  intent: string;
  outputTitle: string;
  skillIds?: string[];
  stepSeconds?: number;
};

export type StagePlan = {
  id: string;
  name: string;
  description: string;
  defaultStageSeconds: number;
  steps: StepPlan[];
};

export type WorkflowTemplate = {
  id: TemplateId;
  name: string;
  description: string;
  focus: string[];
  stages: StagePlan[];
};

export type BuiltinTemplateId = Exclude<TemplateId, "custom">;

export const PLATFORM_OPTIONS = [
  {
    id: "xiaohongshu",
    label: "小红书",
    description: "适合种草、生活方式内容、达人协同和图文短视频混合分发。"
  },
  {
    id: "douyin",
    label: "抖音",
    description: "适合短视频叙事、强钩子内容和投放联动。"
  },
  {
    id: "wechat",
    label: "微信生态",
    description: "适合公众号、社群、私域转化与长文传播。"
  },
  {
    id: "weibo",
    label: "微博",
    description: "适合话题发酵、热点借势和舆情观察。"
  },
  {
    id: "bilibili",
    label: "B站",
    description: "适合深度内容、测评与中长视频种草。"
  },
  {
    id: "private_domain",
    label: "私域",
    description: "适合社群、企业微信和留资转化链路。"
  }
] as const;

export const DEFAULT_WORKFLOW_CONTROL = {
  defaultStepSeconds: 90,
  totalSeconds: 1800
} as const;

export const WORKFLOW_TEMPLATES: Record<BuiltinTemplateId, WorkflowTemplate> = {
  launch_cn: {
    id: "launch_cn",
    name: "新品上市作战",
    description: "围绕新品上市，完成 brief 梳理、传播策略、内容矩阵、渠道节奏和审核闭环。",
    focus: ["新品上市", "站内外联动", "品牌一致性"],
    stages: [
      {
        id: "brief_intake",
        name: "需求 intake",
        description: "梳理核心目标、人群和约束，形成统一 brief。",
        defaultStageSeconds: 180,
        steps: [
          {
            roleId: "briefDesk",
            intent: "整理新品上市 brief，补齐缺失信息与交付边界。",
            outputTitle: "项目需求简报",
            skillIds: ["campaign_brief_parser", "audience_persona_cn"],
            stepSeconds: 70
          },
          {
            roleId: "dataAnalyst",
            intent: "给出目标、预算和 KPI 的初始假设。",
            outputTitle: "目标与指标假设",
            skillIds: ["media_budget_planner"],
            stepSeconds: 60
          }
        ]
      },
      {
        id: "strategy_blueprint",
        name: "策略规划",
        description: "输出核心叙事、传播重点和阶段打法。",
        defaultStageSeconds: 260,
        steps: [
          {
            roleId: "strategyLead",
            intent: "提炼新品上市的传播主张、信息屋和阶段节奏。",
            outputTitle: "策略总纲",
            skillIds: ["message_house", "campaign_architecture"],
            stepSeconds: 90
          },
          {
            roleId: "dataAnalyst",
            intent: "补充预算分层、监测指标和优化信号。",
            outputTitle: "预算与指标建议",
            skillIds: ["campaign_report_cn"],
            stepSeconds: 60
          }
        ]
      },
      {
        id: "content_design",
        name: "内容生产",
        description: "围绕目标平台生成内容矩阵和表达方向。",
        defaultStageSeconds: 280,
        steps: [
          {
            roleId: "contentPlanner",
            intent: "设计新品上市内容矩阵，包括选题、脚本和话术钩子。",
            outputTitle: "内容矩阵与脚本方向",
            skillIds: ["content_calendar_cn", "xiaohongshu_copy", "douyin_script"],
            stepSeconds: 110
          },
          {
            roleId: "channelOperator",
            intent: "将内容矩阵映射到平台节奏、素材规格和分发方式。",
            outputTitle: "渠道分发清单",
            skillIds: ["channel_mix_cn"],
            stepSeconds: 80
          }
        ]
      },
      {
        id: "review_gate",
        name: "审核闭环",
        description: "在发布前完成品牌与合规双审。",
        defaultStageSeconds: 220,
        steps: [
          {
            roleId: "brandReviewer",
            intent: "检查表达是否符合品牌调性、人群感知和产品定位。",
            outputTitle: "品牌审校意见",
            skillIds: ["brand_voice_guard"],
            stepSeconds: 70
          },
          {
            roleId: "complianceGuard",
            intent: "检查广告法、绝对化用语和平台违规风险。",
            outputTitle: "合规审查意见",
            skillIds: ["ad_compliance_cn"],
            stepSeconds: 70
          },
          {
            roleId: "knowledgeManager",
            intent: "沉淀本次新品上市的模板和复用经验。",
            outputTitle: "知识沉淀卡",
            skillIds: ["campaign_report_cn"],
            stepSeconds: 50
          }
        ]
      }
    ]
  },
  promotion_cn: {
    id: "promotion_cn",
    name: "节点大促推进",
    description: "围绕促销节点输出人群分层、内容抓手、转化动作和风险控制。",
    focus: ["促销节点", "转化效率", "活动节奏"],
    stages: [
      {
        id: "intake",
        name: "活动拆题",
        description: "确定节点目标、货盘和重点人群。",
        defaultStageSeconds: 170,
        steps: [
          {
            roleId: "briefDesk",
            intent: "梳理大促目标、货盘重点和转化链路。",
            outputTitle: "节点营销 brief",
            skillIds: ["campaign_brief_parser", "private_domain_funnel"],
            stepSeconds: 70
          }
        ]
      },
      {
        id: "plan",
        name: "作战策略",
        description: "形成会场节奏、利益点设计和沟通框架。",
        defaultStageSeconds: 240,
        steps: [
          {
            roleId: "strategyLead",
            intent: "制定节点大促的阶段策略、利益点和传播叙事。",
            outputTitle: "大促策略总纲",
            skillIds: ["message_house", "campaign_architecture"],
            stepSeconds: 90
          },
          {
            roleId: "channelOperator",
            intent: "规划站内外联动节奏、投放节拍和渠道动作。",
            outputTitle: "渠道节奏表",
            skillIds: ["channel_mix_cn", "media_budget_planner"],
            stepSeconds: 80
          }
        ]
      },
      {
        id: "content",
        name: "内容与转化",
        description: "输出短文案、直播预热和私域承接动作。",
        defaultStageSeconds: 260,
        steps: [
          {
            roleId: "contentPlanner",
            intent: "生成节点内容矩阵、主副卖点和直播预热角度。",
            outputTitle: "促销内容矩阵",
            skillIds: ["xiaohongshu_copy", "douyin_script", "wechat_article"],
            stepSeconds: 110
          },
          {
            roleId: "martechOperator",
            intent: "配置留资、私域承接和自动化提醒链路。",
            outputTitle: "转化链路建议",
            skillIds: ["private_domain_funnel"],
            stepSeconds: 70
          }
        ]
      },
      {
        id: "review",
        name: "上线前审查",
        description: "活动上线前完成品牌和合规核对。",
        defaultStageSeconds: 200,
        steps: [
          {
            roleId: "brandReviewer",
            intent: "检查大促沟通是否过度让价或削弱品牌认知。",
            outputTitle: "品牌风险清单",
            skillIds: ["brand_voice_guard"],
            stepSeconds: 60
          },
          {
            roleId: "complianceGuard",
            intent: "检查促销口径、时效承诺和价格表述风险。",
            outputTitle: "活动合规清单",
            skillIds: ["ad_compliance_cn"],
            stepSeconds: 60
          }
        ]
      }
    ]
  },
  content_matrix_cn: {
    id: "content_matrix_cn",
    name: "内容矩阵生产",
    description: "适合小红书、抖音、公众号等多平台内容批量生产。",
    focus: ["内容矩阵", "平台适配", "选题脚本"],
    stages: [
      {
        id: "brief",
        name: "需求澄清",
        description: "确认内容目标、平台和目标受众。",
        defaultStageSeconds: 150,
        steps: [
          {
            roleId: "briefDesk",
            intent: "整理内容生产 brief，聚焦平台和目标人群。",
            outputTitle: "内容 brief",
            skillIds: ["campaign_brief_parser", "audience_persona_cn"],
            stepSeconds: 60
          }
        ]
      },
      {
        id: "planning",
        name: "选题规划",
        description: "梳理内容支柱、选题方向与表达逻辑。",
        defaultStageSeconds: 220,
        steps: [
          {
            roleId: "strategyLead",
            intent: "搭建内容支柱、信息层级和话题策略。",
            outputTitle: "内容支柱地图",
            skillIds: ["message_house", "content_calendar_cn"],
            stepSeconds: 90
          },
          {
            roleId: "contentPlanner",
            intent: "输出具体选题、标题方向和脚本结构。",
            outputTitle: "选题与脚本清单",
            skillIds: ["xiaohongshu_copy", "douyin_script", "wechat_article"],
            stepSeconds: 100
          }
        ]
      },
      {
        id: "distribution",
        name: "平台适配",
        description: "为各个平台补齐发布节奏与执行动作。",
        defaultStageSeconds: 180,
        steps: [
          {
            roleId: "channelOperator",
            intent: "为不同平台匹配发布时间、形式和资源位建议。",
            outputTitle: "平台适配清单",
            skillIds: ["channel_mix_cn"],
            stepSeconds: 80
          }
        ]
      },
      {
        id: "review",
        name: "审校与沉淀",
        description: "检查表达和沉淀模板。",
        defaultStageSeconds: 160,
        steps: [
          {
            roleId: "brandReviewer",
            intent: "检查选题和脚本是否符合品牌语气。",
            outputTitle: "品牌审校意见",
            skillIds: ["brand_voice_guard"],
            stepSeconds: 55
          },
          {
            roleId: "knowledgeManager",
            intent: "提炼可复用模板和下次复用建议。",
            outputTitle: "复用模板卡",
            skillIds: ["campaign_report_cn"],
            stepSeconds: 45
          }
        ]
      }
    ]
  },
  weekly_report_cn: {
    id: "weekly_report_cn",
    name: "周报与复盘",
    description: "适合营销周报、月报、投放复盘和团队同步材料。",
    focus: ["复盘", "团队同步", "优化建议"],
    stages: [
      {
        id: "data_collection",
        name: "信息汇总",
        description: "整理投放、内容和活动数据表现。",
        defaultStageSeconds: 160,
        steps: [
          {
            roleId: "briefDesk",
            intent: "汇总本周期 campaign 背景、目标和关键动作。",
            outputTitle: "周期背景摘要",
            skillIds: ["campaign_brief_parser"],
            stepSeconds: 60
          },
          {
            roleId: "dataAnalyst",
            intent: "整理 KPI 完成情况、波动和异常点。",
            outputTitle: "数据表现摘要",
            skillIds: ["campaign_report_cn", "competitor_scan_cn"],
            stepSeconds: 80
          }
        ]
      },
      {
        id: "analysis",
        name: "问题诊断",
        description: "输出关键洞察、问题和机会点。",
        defaultStageSeconds: 220,
        steps: [
          {
            roleId: "strategyLead",
            intent: "解释本周期表现背后的策略原因与机会窗口。",
            outputTitle: "核心洞察与判断",
            skillIds: ["campaign_report_cn"],
            stepSeconds: 90
          },
          {
            roleId: "channelOperator",
            intent: "补充平台层面的执行反馈和优化方向。",
            outputTitle: "渠道优化建议",
            skillIds: ["channel_mix_cn"],
            stepSeconds: 70
          }
        ]
      },
      {
        id: "next_actions",
        name: "下一步计划",
        description: "形成团队对齐的后续动作。",
        defaultStageSeconds: 180,
        steps: [
          {
            roleId: "contentPlanner",
            intent: "补充下周期内容计划和素材需求。",
            outputTitle: "内容动作建议",
            skillIds: ["content_calendar_cn"],
            stepSeconds: 60
          },
          {
            roleId: "knowledgeManager",
            intent: "沉淀复盘结论和可复用经验。",
            outputTitle: "复盘沉淀卡",
            skillIds: ["campaign_report_cn"],
            stepSeconds: 50
          }
        ]
      }
    ]
  }
};
