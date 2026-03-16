/**
 * content.ts — MarketerClaw 服务端静态内容
 *
 * 本文件描述 MarketerClaw 系统层面的能力边界、风险声明和导出元数据，
 * 供 /api/workflows/setup 等枚举接口消费，与旧版 OpenClaw 展示站内容无关。
 */

export const SYSTEM_META = {
  name: "MarketerClaw",
  tagline: "面向中国营销从业者的多角色协作工作流系统",
  description:
    "输入营销 brief，系统按内置角色自动推进策略、内容、渠道和审核闭环，输出可直接使用的策略文档、内容资产和复盘建议。",
  version: "1.0.0"
} as const;

/** 系统级风险声明，在导出文件和前端合规提示中使用 */
export const COMPLIANCE_DISCLAIMERS = [
  "所有生成内容仅供参考，上线前请由具备资质的法务或合规人员复核。",
  "本系统不保证生成内容符合最新广告法及平台规则，请以官方最新规定为准。",
  "涉及功效、健康、医疗等敏感领域的表述，需额外进行专业合规审查。",
  "生成结果中的竞品分析仅做参考，不构成市场研究结论。"
] as const;

/** 支持的导出格式及其说明 */
export const EXPORT_FORMAT_LABELS: Record<string, string> = {
  markdown: "Markdown 完整报告",
  json: "JSON 结构化数据",
  "pdf-summary": "PDF 摘要（策略 + 审核）",
  "pdf-full": "PDF 完整报告",
  "platform-assets-markdown": "平台资产包 · Markdown",
  "platform-assets-json": "平台资产包 · JSON",
  "platform-assets-pdf": "平台资产包 · PDF",
  "platform-asset-onepager-markdown": "单平台执行单页 · Markdown",
  "platform-asset-onepager-pdf": "单平台执行单页 · PDF"
};

/** 系统内置 Skills 列表说明（与 skills.ts 保持同步，用于文档生成） */
export const SKILLS_OVERVIEW = [
  { id: "campaign_brief_parser", label: "Brief 解析", summary: "把自然语言 brief 结构化为可校验字段。" },
  { id: "audience_persona_cn", label: "中国人群画像", summary: "输出目标人群的行为、偏好和触媒路径。" },
  { id: "message_house", label: "信息屋", summary: "建立品牌/产品叙事的核心主张与支撑层级。" },
  { id: "campaign_architecture", label: "战役架构", summary: "将策略拆解为阶段、重点和交付清单。" },
  { id: "content_calendar_cn", label: "内容日历（中国）", summary: "按节点和平台规划内容发布节奏。" },
  { id: "xiaohongshu_copy", label: "小红书文案", summary: "生成小红书种草笔记的标题、正文和钩子。" },
  { id: "douyin_script", label: "抖音脚本", summary: "生成短视频口播脚本和镜头分段结构。" },
  { id: "wechat_article", label: "微信长文", summary: "生成公众号长文框架和私域承接动作。" },
  { id: "channel_mix_cn", label: "渠道组合（中国）", summary: "输出平台优先级、资源分配和发布节奏。" },
  { id: "media_budget_planner", label: "媒体预算规划", summary: "给出预算分层、KPI 假设和优化信号。" },
  { id: "competitor_scan_cn", label: "竞品扫描（中国）", summary: "解读竞品动作并给出差异化回应建议。" },
  { id: "ad_compliance_cn", label: "广告合规（中国）", summary: "识别广告法风险和平台规则违规点。" },
  { id: "brand_voice_guard", label: "品牌语气守则", summary: "校验内容是否符合品牌调性和表达边界。" },
  { id: "private_domain_funnel", label: "私域转化漏斗", summary: "设计私域留资、承接和二次触达链路。" },
  { id: "campaign_report_cn", label: "战役复盘（中国）", summary: "输出数据解读、问题归因和下一步建议。" }
] as const;
