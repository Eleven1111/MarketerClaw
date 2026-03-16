import type { AgentRegistryEntry } from "./types.js";

export const AGENT_REGISTRY: AgentRegistryEntry[] = [
  {
    roleId: "briefDesk",
    codename: "brief-desk",
    label: "需求分诊台",
    lane: "intake",
    mandate: "接收业务输入，统一目标、约束、平台和交付范围，形成可执行营销 brief。",
    approvalScope: "确认需求是否完整，判断是否具备进入策略阶段的前提。",
    defaultOutputs: ["需求简报", "人群假设", "待补充信息清单"],
    defaultSkillIds: ["campaign_brief_parser", "audience_persona_cn", "private_domain_funnel"]
  },
  {
    roleId: "strategyLead",
    codename: "strategy-lead",
    label: "策略负责人",
    lane: "strategy",
    mandate: "把 brief 转成传播策略、信息屋、阶段打法和 campaign 结构。",
    approvalScope: "确认项目的叙事框架、平台优先级和阶段目标是否成立。",
    defaultOutputs: ["策略总纲", "信息屋", "Campaign 架构图"],
    defaultSkillIds: ["message_house", "campaign_architecture", "channel_mix_cn"]
  },
  {
    roleId: "contentPlanner",
    codename: "content-planner",
    label: "内容策划",
    lane: "production",
    mandate: "围绕平台语境生成内容矩阵、脚本、标题方向和表达角度。",
    approvalScope: "确认内容是否能支持策略主线并适配平台传播习惯。",
    defaultOutputs: ["内容矩阵", "短视频脚本", "图文选题"],
    defaultSkillIds: ["content_calendar_cn", "xiaohongshu_copy", "douyin_script", "wechat_article"]
  },
  {
    roleId: "channelOperator",
    codename: "channel-operator",
    label: "渠道投放",
    lane: "distribution",
    mandate: "制定平台节奏、资源位、投放动作和分发优先级。",
    approvalScope: "确认站内外联动、投放节拍和资源分配是否合理。",
    defaultOutputs: ["渠道执行清单", "投放节奏表", "资源位建议"],
    defaultSkillIds: ["channel_mix_cn", "media_budget_planner"]
  },
  {
    roleId: "brandReviewer",
    codename: "brand-reviewer",
    label: "品牌审校",
    lane: "review",
    mandate: "审查品牌表达、语气边界和目标人群感知的一致性。",
    approvalScope: "品牌上线门禁，未通过时不能进入 ready to launch。",
    defaultOutputs: ["品牌审校意见", "表达风险清单"],
    defaultSkillIds: ["brand_voice_guard"]
  },
  {
    roleId: "complianceGuard",
    codename: "compliance-guard",
    label: "合规审查",
    lane: "review",
    mandate: "检查广告法、平台规则和高风险表述，给出阻塞级意见。",
    approvalScope: "合规上线门禁，未通过时不能进入 ready to launch。",
    defaultOutputs: ["合规审查意见", "违规表达修正建议"],
    defaultSkillIds: ["ad_compliance_cn"]
  },
  {
    roleId: "dataAnalyst",
    codename: "data-analyst",
    label: "数据分析",
    lane: "strategy",
    mandate: "提供预算分层、KPI 设计、监测维度和复盘切面。",
    approvalScope: "确认指标是否可追踪、预算是否与目标匹配。",
    defaultOutputs: ["预算建议", "指标框架", "数据表现摘要"],
    defaultSkillIds: ["media_budget_planner", "competitor_scan_cn", "campaign_report_cn"]
  },
  {
    roleId: "martechOperator",
    codename: "martech-operator",
    label: "营销自动化",
    lane: "operations",
    mandate: "设计表单、归因、留资、自动化触达和协作链路。",
    approvalScope: "确认技术支撑链路是否可落地、可追踪。",
    defaultOutputs: ["转化链路建议", "自动化配置项", "埋点建议"],
    defaultSkillIds: ["private_domain_funnel"]
  },
  {
    roleId: "knowledgeManager",
    codename: "knowledge-manager",
    label: "知识运营",
    lane: "operations",
    mandate: "沉淀模板、复盘、禁用表达库和高表现案例。",
    approvalScope: "确认项目经验是否被结构化保留，便于后续复用。",
    defaultOutputs: ["复盘沉淀卡", "模板包", "风险案例库"],
    defaultSkillIds: ["campaign_report_cn", "content_calendar_cn"]
  }
];
