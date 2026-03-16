import type { RoleId } from "./catalog.js";

export type SkillDefinition = {
  id: string;
  name: string;
  description: string;
  deliverable: string;
  appliesTo: RoleId[];
};

export const SKILL_LIBRARY: SkillDefinition[] = [
  {
    id: "campaign_brief_parser",
    name: "Campaign Brief Parser",
    description: "把业务输入整理成结构化营销 brief，补齐目标、约束和关键缺口。",
    deliverable: "需求简报",
    appliesTo: ["briefDesk"]
  },
  {
    id: "audience_persona_cn",
    name: "Audience Persona CN",
    description: "提炼中国市场人群画像、消费动机与决策阻力。",
    deliverable: "人群洞察",
    appliesTo: ["briefDesk", "strategyLead"]
  },
  {
    id: "message_house",
    name: "Message House",
    description: "生成传播主张、支撑信息和差异化表达框架。",
    deliverable: "策略总纲",
    appliesTo: ["strategyLead"]
  },
  {
    id: "campaign_architecture",
    name: "Campaign Architecture",
    description: "把 campaign 拆成阶段目标、节奏和执行模块。",
    deliverable: "Campaign 结构图",
    appliesTo: ["strategyLead", "channelOperator"]
  },
  {
    id: "content_calendar_cn",
    name: "Content Calendar CN",
    description: "生成适合中国平台语境的内容支柱、排期和选题结构。",
    deliverable: "内容排期",
    appliesTo: ["contentPlanner", "knowledgeManager"]
  },
  {
    id: "xiaohongshu_copy",
    name: "Xiaohongshu Copy",
    description: "输出小红书风格标题、封面角度和笔记表达方向。",
    deliverable: "小红书文案",
    appliesTo: ["contentPlanner"]
  },
  {
    id: "douyin_script",
    name: "Douyin Script",
    description: "输出适合抖音短视频的脚本节奏、口播结构和钩子。",
    deliverable: "抖音脚本",
    appliesTo: ["contentPlanner"]
  },
  {
    id: "wechat_article",
    name: "WeChat Article",
    description: "输出公众号长文结构、章节框架和转化承接逻辑。",
    deliverable: "公众号选题",
    appliesTo: ["contentPlanner"]
  },
  {
    id: "channel_mix_cn",
    name: "Channel Mix CN",
    description: "给出国内主流平台的分发节奏、资源位和执行建议。",
    deliverable: "渠道执行清单",
    appliesTo: ["channelOperator", "strategyLead"]
  },
  {
    id: "media_budget_planner",
    name: "Media Budget Planner",
    description: "输出预算分层、投放节奏和 KPI 假设。",
    deliverable: "预算建议",
    appliesTo: ["dataAnalyst", "channelOperator"]
  },
  {
    id: "competitor_scan_cn",
    name: "Competitor Scan CN",
    description: "梳理竞品动作、热点方向和市场机会窗。",
    deliverable: "竞品扫描",
    appliesTo: ["dataAnalyst", "strategyLead"]
  },
  {
    id: "ad_compliance_cn",
    name: "Ad Compliance CN",
    description: "检查广告法、绝对化用语、功效承诺和平台规则风险。",
    deliverable: "合规意见",
    appliesTo: ["complianceGuard"]
  },
  {
    id: "brand_voice_guard",
    name: "Brand Voice Guard",
    description: "检查品牌语气、人群匹配和表达一致性。",
    deliverable: "品牌审校意见",
    appliesTo: ["brandReviewer"]
  },
  {
    id: "private_domain_funnel",
    name: "Private Domain Funnel",
    description: "为私域承接、留资与自动化触达设计链路。",
    deliverable: "私域转化链路",
    appliesTo: ["martechOperator", "briefDesk"]
  },
  {
    id: "campaign_report_cn",
    name: "Campaign Report CN",
    description: "生成中文周报、月报和复盘文档骨架。",
    deliverable: "复盘报告",
    appliesTo: ["dataAnalyst", "knowledgeManager"]
  }
];
