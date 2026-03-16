import crypto from "node:crypto";
import {
  ROLE_DEFINITIONS,
  REQUIRED_ROLE_IDS,
  WORKFLOW_TEMPLATES,
  type RoleId,
  type WorkflowTemplate
} from "./catalog.js";
import { AGENT_REGISTRY } from "./agents.js";
import { generateText } from "./model-client.js";
import { SKILL_LIBRARY } from "./skills.js";
import type {
  ApprovalState,
  AgentRegistryEntry,
  ConfiguredRole,
  CreateWorkflowRequest,
  Deliverables,
  ReviewFinding,
  ReviewGate,
  ReviewSummary,
  TeamSnapshot,
  WorkboardSummary,
  WorkflowMeta,
  WorkflowRun,
  WorkflowRunHooks,
  WorkflowArtifact,
  WorkflowStageResult,
  WorkflowStep,
  WorkflowStreamEvent
} from "./types.js";

const roleMapById = new Map(ROLE_DEFINITIONS.map((role) => [role.id, role] as const));
const agentMapByRoleId = new Map(AGENT_REGISTRY.map((agent) => [agent.roleId, agent] as const));

type WorkflowRunOptions = {
  rerunOf?: string | null;
  rerunMode?: "full" | "stage" | "role";
  startStageId?: string;
  startRoleId?: RoleId;
  previousRun?: WorkflowRun;
};

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function safeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function estimateOutputSeconds(content: string): number {
  const compact = content.replace(/\s+/g, "");
  if (!compact) {
    return 10;
  }
  return Math.max(10, Math.ceil(compact.length / 4));
}

function shortenToSeconds(content: string, allowedSeconds: number): { text: string; truncated: boolean } {
  const estimated = estimateOutputSeconds(content);
  if (estimated <= allowedSeconds) {
    return { text: content, truncated: false };
  }

  const ratio = allowedSeconds / estimated;
  const targetLength = Math.max(36, Math.floor(content.length * ratio));
  const shortened = content.slice(0, targetLength);
  const breakIndex = Math.max(
    shortened.lastIndexOf("。"),
    shortened.lastIndexOf("！"),
    shortened.lastIndexOf("？"),
    shortened.lastIndexOf("；")
  );

  if (breakIndex > 16) {
    return {
      text: `${shortened.slice(0, breakIndex + 1)} [已截短]`,
      truncated: true
    };
  }

  return {
    text: `${shortened}... [已截短]`,
    truncated: true
  };
}

function summarizeRecentSteps(steps: WorkflowStep[]): string[] {
  return steps
    .slice(-6)
    .map(
      (step) =>
        `${step.roleName} / ${step.outputTitle} / ${step.intent}：${safeText(step.content)}`
    );
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function findStepByRole(steps: WorkflowStep[], roleId: RoleId): WorkflowStep | undefined {
  return steps.find((step) => step.roleId === roleId);
}

function findStepsByRole(steps: WorkflowStep[], roleId: RoleId): WorkflowStep[] {
  return steps.filter((step) => step.roleId === roleId);
}

function buildAudienceInsights(payload: CreateWorkflowRequest): string[] {
  const { campaign } = payload;
  const platformHint =
    campaign.secondaryPlatforms.length > 0
      ? `${campaign.primaryPlatform} 作为主阵地承接首波声量，${campaign.secondaryPlatforms.join("、")} 负责补充搜索覆盖与二次转化。`
      : `${campaign.primaryPlatform} 是当前的唯一主阵地，内容设计要优先考虑该平台的互动和转化逻辑。`;
  const proofPoint =
    campaign.productProofPoints[0] ?? `${campaign.productName} 需要一个更明确的场景化卖点`;

  return [
    `${campaign.targetAudience} 是当前最核心的人群，需要用真实场景而不是抽象卖点触发兴趣。`,
    `${campaign.objective} 决定了内容必须兼顾品牌表达与结果导向，不能只追求表面互动。`,
    `${campaign.regionFocus} 是当前重点区域，传播和投放节奏要考虑该区域的人群习惯与渠道覆盖。`,
    `当前最强卖点建议围绕「${proofPoint}」展开，避免只讲功能参数不讲具体收益。`,
    platformHint
  ];
}

function defaultFormatForPlatform(platform: string): string {
  if (platform.includes("小红书")) {
    return "图文笔记 / 口播短视频";
  }
  if (platform.includes("抖音")) {
    return "竖版短视频 / 直播切片";
  }
  if (platform.includes("微信")) {
    return "公众号长文 / 社群承接";
  }
  if (platform.includes("微博")) {
    return "热点话题帖 / 联动海报";
  }
  if (platform.includes("B站")) {
    return "测评视频 / 深度种草";
  }
  return "平台适配内容";
}

function collectPlatforms(payload: CreateWorkflowRequest): string[] {
  return [payload.campaign.primaryPlatform, ...payload.campaign.secondaryPlatforms].filter(
    (value, index, array) => value && array.indexOf(value) === index
  );
}

function normalizeCompetitorEntries(entries: CreateWorkflowRequest["campaign"]["competitorEntries"]) {
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

function classifyCompetitorMove(text: string): string {
  if (includesAny(text, ["低价", "折扣", "优惠", "大促", "买赠"])) {
    return "价格促销";
  }
  if (includesAny(text, ["达人", "kol", "koc", "测评", "探店"])) {
    return "达人种草";
  }
  if (includesAny(text, ["直播", "连播", "直播间"])) {
    return "直播转化";
  }
  if (includesAny(text, ["投流", "投放", "冲量", "dou+", "信息流"])) {
    return "付费投放";
  }
  if (includesAny(text, ["成分", "功效", "品牌", "理念", "故事"])) {
    return "品牌叙事";
  }
  return "内容铺量";
}

function buildPlatformPlaybooks(payload: CreateWorkflowRequest, timeline: WorkflowStep[]) {
  const strategyStep = findStepByRole(timeline, "strategyLead");
  const channelStep = findStepByRole(timeline, "channelOperator");
  const proofPoint =
    payload.campaign.productProofPoints[0] ?? `${payload.campaign.productName} 的核心场景价值`;
  const allPlatforms = collectPlatforms(payload);

  return allPlatforms.map((platform) => ({
    platform,
    positioning: `${platform} 侧重用「${proofPoint}」切入 ${payload.campaign.targetAudience} 的真实使用场景。`,
    contentPillars: [
      `围绕 ${payload.campaign.targetAudience} 的高频痛点建立第一层内容钩子`,
      `用 ${payload.campaign.productName} 的真实体验和证明素材建立信任`,
      `用 ${payload.campaign.objective} 对应的转化动作完成收口`
    ],
    distributionMoves: [
      platform === payload.campaign.primaryPlatform
        ? "作为主阵地承接首轮声量和核心素材测试"
        : "作为补充阵地承接二次扩散、搜词覆盖和转化回流",
      payload.campaign.channelConstraints || "根据预算和资源位限制安排发布节奏",
      channelStep?.content ?? "优先保留 AB 素材并按互动和转化信号快速优化"
    ],
    measurementFocus: [
      `${platform} 需要重点关注内容互动、点击和转化衔接`,
      `围绕 ${payload.campaign.kpis} 做平台内外一致的监测切面`,
      strategyStep?.content ?? "策略是否被内容和渠道执行准确表达"
    ]
  }));
}

function buildCompetitorInsights(payload: CreateWorkflowRequest) {
  const entries = normalizeCompetitorEntries(payload.campaign.competitorEntries ?? []);
  if (entries.length > 0) {
    return entries.map((entry) => ({
      competitor: entry.competitor,
      category: classifyCompetitorMove(
        `${entry.platform} ${entry.move} ${entry.messageAngle} ${entry.weakness}`
      ),
      move: `${entry.platform} / ${entry.move}`,
      implication: `对方正在用「${entry.messageAngle}」争夺 ${payload.campaign.targetAudience} 的注意力与品类认知。`,
      response: `优先放大「${entry.weakness}」对应的空档，用 ${payload.campaign.productProofPoints[0] ?? payload.campaign.productName} 做差异化回应。`
    }));
  }

  const notes = payload.campaign.competitorNotes ?? [];
  if (notes.length === 0) {
    return [
      {
        competitor: "待补充竞品",
        category: "待补充",
        move: "尚未提供明确竞品动作",
        implication: "缺少对比基线时，策略容易落回泛泛表达。",
        response: "建议补充 2-3 个核心竞品的近期内容、投放或活动动作。"
      }
    ];
  }

  return notes.map((note, index) => ({
    competitor: `竞品 ${index + 1}`,
    category: classifyCompetitorMove(note),
    move: note,
    implication: `该动作会影响 ${payload.campaign.targetAudience} 对品类价值和表达标准的预期。`,
    response: `建议围绕 ${payload.campaign.productProofPoints[index] ?? payload.campaign.productName} 做更明确的差异化回应，避免跟随式表达。`
  }));
}

function buildContentMatrix(payload: CreateWorkflowRequest, timeline: WorkflowStep[]) {
  const contentStep = findStepByRole(timeline, "contentPlanner");
  const proofPoint =
    payload.campaign.productProofPoints[0] ?? `${payload.campaign.productName} 的场景化价值`;
  const proof2 =
    payload.campaign.productProofPoints[1] ?? `${payload.campaign.productName} 的差异化体验`;
  const platforms = collectPlatforms(payload);
  const competitor = (payload.campaign.competitorEntries ?? [])[0];
  const contentHint = contentStep?.content ?? "";

  return platforms.map((platform, index) => {
    const isPrimary = index === 0;

    if (platform.includes("小红书")) {
      return {
        platform,
        angle: isPrimary
          ? `从 ${payload.campaign.targetAudience} 的日常痛点切入，用真实体验展开 ${proofPoint}`
          : `围绕主平台已验证的高互动角度做二次放大，突出 ${proof2}`,
        format: "图文笔记 / 口播短视频",
        hook: `标题抛痛点或对比结果——「${payload.campaign.targetAudience} 注意，你以为的 [常见误区] 其实是...」`,
        cta: "引导收藏笔记 + 评论关键词领取 + 主页查看转化入口",
        toneGuide: `保持 ${payload.campaign.brandTone}，用日常表达代替品牌口号，真实感 > 完美感`,
        competitorDiff: competitor
          ? `针对 ${competitor.competitor} 的「${competitor.messageAngle}」，从 ${competitor.weakness} 薄弱处做差异化`
          : "暂无竞品参照，优先建立自身场景化叙事",
      };
    }

    if (platform.includes("抖音")) {
      return {
        platform,
        angle: isPrimary
          ? `前3秒抛出 ${payload.campaign.targetAudience} 的痛点，用 ${proofPoint} 做反差切入`
          : `复用主平台高表现角度，适配竖版短视频节奏`,
        format: "竖版短视频 / 直播切片 / 口播",
        hook: `冲突开场——「为什么 ${payload.campaign.targetAudience} 一定要知道这个？」或结果开场——「就这一步解决了...」`,
        cta: "评论区回复关键词领福利 / 点击购物车 / 关注看下期",
        toneGuide: `节奏紧凑，3秒一个信息点，语气 ${payload.campaign.brandTone}，不拖沓不说教`,
        competitorDiff: competitor
          ? `避开 ${competitor.competitor} 已占领的功效话术，转向「真实使用过程」路线`
          : "用使用前后的场景对比建立信任",
      };
    }

    if (platform.includes("微信")) {
      return {
        platform,
        angle: isPrimary
          ? `用决策问题带入 ${payload.campaign.targetAudience}，再展开完整产品逻辑`
          : `承接其他平台引流的深度兴趣用户，提供完整的信任证明链`,
        format: "公众号长文 / 社群内容 / 私域承接文",
        hook: `开头设问——「如果你正在考虑 [品类]，这篇可能帮你省去 80% 的试错成本」`,
        cta: "引导进群 / 留资 / 预约专属顾问 / 查看完整活动说明",
        toneGuide: `长文信任建立为主，语气 ${payload.campaign.brandTone}，结构清晰不灌水`,
        competitorDiff: competitor
          ? `长文适合详细拆解与 ${competitor.competitor} 的差异，用数据和案例替代口号`
          : "重点补齐产品证明和使用案例",
      };
    }

    if (platform.includes("微博")) {
      return {
        platform,
        angle: isPrimary
          ? `借势热点或品类话题，快速引发 ${payload.campaign.targetAudience} 的讨论`
          : `配合主平台节奏，用话题帖扩大品类声量`,
        format: "热点话题帖 / 联动海报 / 评论互动",
        hook: `先给结论或观点，再点出 ${payload.campaign.productName} 的关联——短平快，不超 140 字核心`,
        cta: "带话题词参与讨论 / @好友互动 / 转发抽奖",
        toneGuide: `${payload.campaign.brandTone}，偏轻松对话感，不做长篇大论`,
        competitorDiff: competitor
          ? `关注 ${competitor.competitor} 的舆情动向，及时借势或回应`
          : "用品类话题快速破圈",
      };
    }

    if (platform.includes("B站")) {
      return {
        platform,
        angle: isPrimary
          ? `深度测评 ${payload.campaign.productName}，用数据和体验说服 ${payload.campaign.targetAudience}`
          : `以中长视频形式补充其他平台无法展开的深度内容`,
        format: "测评视频 / 深度种草 / 开箱体验",
        hook: `开头直说结论——「${payload.campaign.productName} 值不值得买，看完这期你就有数了」`,
        cta: "评论区讨论体验 / 一键三连 / 关注后续对比评测",
        toneGuide: `测评语气为主，${payload.campaign.brandTone}，客观可信 > 卖货感`,
        competitorDiff: competitor
          ? `适合做与 ${competitor.competitor} 的正面对比测评，让数据说话`
          : "用模块化拆解建立专业信任",
      };
    }

    // 私域 / 通用平台
    return {
      platform,
      angle: isPrimary
        ? `从 ${payload.campaign.targetAudience} 的核心痛点切入，突出 ${proofPoint}`
        : `围绕主平台素材做二次放大，强调 ${payload.campaign.productName} 的不同使用场景`,
      format: defaultFormatForPlatform(platform),
      hook: platform.includes("私域")
        ? `用福利或干货做入群钩子——「加入后立即获得 [具体价值]」`
        : `先给场景和利益点，再给产品证明与转化动作`,
      cta: platform.includes("私域")
        ? "引导加企业微信 / 入群 / 领取专属资料"
        : `引导查看 ${payload.campaign.productName} 的完整活动信息`,
      toneGuide: `保持 ${payload.campaign.brandTone}，不过度促销`,
      competitorDiff: competitor
        ? `围绕 ${competitor.weakness} 做差异化回应`
        : "优先建立自身场景优势",
    };
  });
}

function buildPlatformAssets(
  payload: CreateWorkflowRequest,
  timeline: WorkflowStep[]
): Deliverables["platformAssets"] {
  const proofPoint =
    payload.campaign.productProofPoints[0] ?? `${payload.campaign.productName} 的核心使用价值`;
  const proof2 =
    payload.campaign.productProofPoints[1] ?? `${payload.campaign.productName} 的差异化体验`;
  const contentStep = findStepByRole(timeline, "contentPlanner");
  const channelStep = findStepByRole(timeline, "channelOperator");
  const brandStep = findStepByRole(timeline, "brandReviewer");
  const leadCompetitor = buildCompetitorInsights(payload)[0];
  const audience = payload.campaign.targetAudience;
  const brandTone = payload.campaign.brandTone;

  return collectPlatforms(payload).map((platform) => {
    if (platform.includes("小红书")) {
      return {
        platform,
        assetType: "xiaohongshu_note",
        title: `${payload.campaign.productName} 小红书种草笔记卡`,
        hook: `「${audience}，你有没有也遇到过 [痛点]？试了这个後发现 ${proofPoint} 竟然是真的」——标题要有搜索关键词 + 痛点或对比结构`,
        structure: [
          `标题：20字内，含核心品类词 + 痛点/对比结构，真实感 > 广告感`,
          `第一段：场景代入，用"我"视角讲真实困境（100字）`,
          `第二段：产品登场，用「${proofPoint}」解释为什么有效，给使用细节而非参数（150字）`,
          `第三段：使用结果，最好有对比、数字或情绪变化（100字）`,
          `标签：3-5个（品类词 + 场景词 + 人群词）`,
        ],
        cta: "收藏笔记 + 评论「关键词」领取 + 点击主页查看转化入口",
        notes: contentStep?.content ??
          `语气保持 ${brandTone}，对比 ${leadCompetitor.competitor} 的打法时用体验证据替代口号。发布时段建议晚 8-10 点或午休 12-13 点。`,
      };
    }

    if (platform.includes("抖音")) {
      return {
        platform,
        assetType: "douyin_script",
        title: `${payload.campaign.productName} 抖音脚本卡`,
        hook: `前3秒决定完播率——冲突开场：「${audience} 注意！你以为的 [误区] 其实是...」或结果开场：「就这一步，${payload.campaign.productName} 帮我解决了 [问题]」`,
        structure: [
          `前3秒：冲突/结果/问题开场，不废话直接进（选择1种风格）`,
          `10-15秒：展示使用前状态，引发情感共鸣（不用「完美」用「真实」）`,
          `15-25秒：产品/方案介入，用 ${proofPoint} 做核心证明`,
          `25-35秒：使用后结果展示（尽量可见/可测量）+ 信任状`,
          `最后5秒：动作指令——「评论回复 XX 领福利 / 点击购物车 / 关注看下期」`,
        ],
        cta: "评论区领取关键词 + 进入直播间 + 点击购物车",
        notes: channelStep?.content ??
          `准备 AB 两版开头（A冲突 / B结果），按完播率择优。口播语气 ${brandTone}。约束：${payload.campaign.channelConstraints || "暂无特殊限制"}。`,
      };
    }

    if (platform.includes("微信")) {
      return {
        platform,
        assetType: "wechat_article",
        title: `${payload.campaign.productName} 微信长文框架`,
        hook: `开头设问——「如果你是 ${audience}，正在考虑 [品类]，这篇可能帮你省去 80% 的试错成本」`,
        structure: [
          `标题：结果导向或问题导向，15字内，不用夸张标题党`,
          `开头段：场景设问，引发代入感（不直接介绍产品，先建立阅读理由）`,
          `痛点段：让读者感到"说的就是我"——用具体场景而非抽象描述`,
          `方案段：引入 ${payload.campaign.productName}，用 ${proofPoint} 和使用场景描述（不堆参数）`,
          `证明段：数据点 / 成分 / 用户评价 / 具体案例`,
          `私域承接：文末引导加企微 / 进群 / 预约，给出明确价值（资料/福利/顾问）`,
        ],
        cta: "回复关键词获取资料 / 扫码进群 / 点击查看完整活动说明",
        notes: `重点补齐 ${payload.campaign.campaignWindow} 的活动机制和转化承接说明。阅读时长控制在 4 分钟内，每 500 字建议配 1 张图。`,
      };
    }

    if (platform.includes("微博")) {
      return {
        platform,
        assetType: "weibo_post",
        title: `${payload.campaign.productName} 微博内容卡`,
        hook: `先给结论或借势热点切入——短平快，140字核心 + 可展开长图`,
        structure: [
          `正文 140 字内核心：结论先行 + 产品关联 + 互动引导`,
          `话题词：#品类话题# #节点热点#，至少 2 个`,
          `配图：对比图 / 数字图 / 场景图，方形或 16:9`,
          `互动设计：投票 / 转发抽奖 / @好友，降低参与门槛`,
        ],
        cta: "带话题词参与讨论 / 转发扩散 / 评论区互动",
        notes: `${brandTone} 偏轻松对话感。扩散动作：联动相关大V或品牌官微。注意热点借势时避免不当捆绑。`,
      };
    }

    if (platform.includes("B站")) {
      return {
        platform,
        assetType: "bilibili_video",
        title: `${payload.campaign.productName} B站测评/种草卡`,
        hook: `开头直给结论——「${payload.campaign.productName} 值不值得买？看完这期你就有数了。」`,
        structure: [
          `开头（30秒内）：直说本期测什么、结论是什么，不绕弯子`,
          `中段：模块化拆解（外观/成分/使用体验/对比），每段有小标题`,
          `结尾：综合推荐结论 + 评论区引导话题`,
          `封面：大字结论 + 产品图，不花哨`,
          `弹幕预埋：一个让观众主动参与的问题`,
        ],
        cta: "评论区讨论使用体验 / 一键三连 / 关注后续对比评测",
        notes: `测评语气为主，${brandTone}，客观可信 > 卖货感。视频时长建议 5-8 分钟。`,
      };
    }

    // 私域
    if (platform.includes("私域")) {
      return {
        platform,
        assetType: "private_domain",
        title: `${payload.campaign.productName} 私域承接方案`,
        hook: `入群/加人後第一句——「欢迎！你将获得 [具体价值]。先送你一份 [福利/资料]。」`,
        structure: [
          `入口设计：公众号文章末尾 / 短视频评论区 / DM 关键词自动回复`,
          `欢迎语：感谢+明确价值+立即可用的福利+引导第一次互动`,
          `7日节奏：Day1 福利 / Day3 干货 / Day5 UGC / Day7 限时活动`,
          `转化动作：预约试用 / 优惠券 / 购买链接`,
          `高意向标记：根据互动行为自动打标，触发人工跟进`,
        ],
        cta: "加企业微信 / 入群领取专属资料 / 预约顾问",
        notes: `重点是信任培育而非快速成交。${brandTone}，不在入群第一天就直接推销。`,
      };
    }

    // 通用 fallback
    return {
      platform,
      assetType: "generic_asset",
      title: `${platform} 平台适配资产`,
      hook: `围绕 ${proofPoint} 建立 ${platform} 用户能秒懂的第一句话——先给利益点再给产品。`,
      structure: [
        `核心表达：先给使用场景和利益点`,
        `产品证明：用 ${proofPoint} 做核心支撑，给细节不给口号`,
        `差异化：对比 ${leadCompetitor.competitor} 突出空档优势`,
        `转化动作：清晰的下一步指令`,
      ],
      cta: `引导查看 ${payload.campaign.productName} 的完整活动信息`,
      notes: `结合 ${platform} 的平台习惯，保持 ${brandTone} 语气，规避过度促销和广告法风险。`,
    };
  });
}


function buildReviewSummary(
  payload: CreateWorkflowRequest,
  timeline: WorkflowStep[]
): ReviewSummary {
  const campaignText = [
    payload.campaign.brief,
    payload.campaign.riskNotes,
    payload.campaign.deliverableSpec,
    ...timeline.map((step) => step.content)
  ].join("\n");

  const findings: ReviewFinding[] = [];

  if (includesAny(campaignText, ["最", "第一", "唯一", "100%", "保证", "立刻见效", "永久"])) {
    findings.push({
      title: "存在绝对化或承诺性表达风险",
      severity: "高",
      detail: "内容中出现易触发广告法风险的绝对化或结果承诺性表述，需要改成可验证、可量化的说法。",
      ownerRoleId: "complianceGuard"
    });
  }

  if (payload.campaign.brandTone.length < 6) {
    findings.push({
      title: "品牌调性描述过于粗糙",
      severity: "中",
      detail: "当前品牌调性不足以指导内容风格，建议补充关键词、语气边界和禁用表达。",
      ownerRoleId: "brandReviewer"
    });
  }

  if (!findStepByRole(timeline, "dataAnalyst")) {
    findings.push({
      title: "缺少指标与预算视角",
      severity: "中",
      detail: "当前工作流没有数据分析步骤，可能导致方案缺少预算假设和 KPI 闭环。",
      ownerRoleId: "dataAnalyst"
    });
  }

  if (!findStepByRole(timeline, "knowledgeManager")) {
    findings.push({
      title: "未沉淀复用资产",
      severity: "低",
      detail: "建议在交付完成后沉淀模板、案例和风险清单，降低后续 campaign 的重复劳动。",
      ownerRoleId: "knowledgeManager"
    });
  }

  const brandStatus: "通过" | "需修改" = findings.some(
    (item) => item.ownerRoleId === "brandReviewer" && item.severity !== "低"
  )
    ? "需修改"
    : "通过";
  const complianceStatus: "通过" | "需修改" = findings.some(
    (item) => item.ownerRoleId === "complianceGuard" && item.severity === "高"
  )
    ? "需修改"
    : "通过";

  const baseScore = 90;
  const penalty = findings.reduce((sum, item) => {
    if (item.severity === "高") {
      return sum + 14;
    }
    if (item.severity === "中") {
      return sum + 8;
    }
    return sum + 4;
  }, 0);
  const readinessScore = clamp(baseScore - penalty, 48, 96);

  const riskLevel: "低" | "中" | "高" =
    readinessScore >= 82 ? "低" : readinessScore >= 66 ? "中" : "高";

  const highlights = [
    `主平台聚焦 ${payload.campaign.primaryPlatform}，便于统一内容节奏和执行资源。`,
    `品牌调性已指定为「${payload.campaign.brandTone}」，可以作为后续所有素材的统一校准基线。`,
    `当前交付目标为「${payload.campaign.deliverableSpec}」，有利于把内容、渠道和复盘对齐到一个输出标准。`
  ];

  const nextActions = [
    "把品牌审校和合规审查提出的问题逐条映射到具体素材，形成修改清单。",
    "先用 1-2 组核心素材小范围试投，再决定是否扩大预算和渠道覆盖。",
    "将本次项目的高表现内容和风险案例沉淀到知识库，作为下次 campaign 的默认模板。"
  ];

  const overallVerdict =
    brandStatus === "通过" && complianceStatus === "通过"
      ? "工作流已具备上线准备度，建议先进行小规模试运行，再根据数据反馈追加预算和渠道。"
      : "工作流的核心方向可用，但仍需先完成品牌或合规修改，再进入正式发布阶段。";

  return {
    readinessScore,
    riskLevel,
    brandStatus,
    complianceStatus,
    overallVerdict,
    highlights,
    findings,
    nextActions
  };
}

function artifactKindForLane(lane: AgentRegistryEntry["lane"]): WorkflowArtifact["kind"] {
  switch (lane) {
    case "intake":
      return "brief";
    case "strategy":
      return "strategy";
    case "production":
      return "content";
    case "distribution":
      return "channel";
    case "review":
      return "review";
    case "operations":
      return "ops";
    default:
      return "ops";
  }
}

function buildReviewGates(
  timeline: WorkflowStep[],
  review: ReviewSummary
): ReviewGate[] {
  const brandStep = findStepByRole(timeline, "brandReviewer");
  const complianceStep = findStepByRole(timeline, "complianceGuard");

  return [
    {
      id: "brand_gate",
      label: "品牌审校门",
      ownerRoleId: "brandReviewer",
      status: review.brandStatus,
      blocking: review.brandStatus === "需修改",
      summary:
        brandStep?.content ??
        "当前工作流未提供单独的品牌审校内容，建议补充品牌语气、调性边界和禁用表达。",
      relatedFindings: review.findings.filter((item) => item.ownerRoleId === "brandReviewer")
    },
    {
      id: "compliance_gate",
      label: "合规审查门",
      ownerRoleId: "complianceGuard",
      status: review.complianceStatus,
      blocking: review.complianceStatus === "需修改",
      summary:
        complianceStep?.content ??
        "当前工作流未提供单独的合规意见，建议补充广告法和平台规则核查。",
      relatedFindings: review.findings.filter((item) => item.ownerRoleId === "complianceGuard")
    }
  ];
}

function buildApprovalState(gates: ReviewGate[]): ApprovalState {
  const blockingGateIds = gates.filter((gate) => gate.blocking).map((gate) => gate.id);
  const launchReady = blockingGateIds.length === 0 && gates.length > 0;

  let currentPhase: ApprovalState["currentPhase"] = "drafting";
  if (blockingGateIds.length > 0) {
    currentPhase = "blocked";
  } else if (launchReady) {
    currentPhase = "ready_to_launch";
  } else if (gates.some((gate) => gate.id === "compliance_gate")) {
    currentPhase = "compliance_review";
  } else if (gates.some((gate) => gate.id === "brand_gate")) {
    currentPhase = "brand_review";
  }

  return {
    currentPhase,
    launchReady,
    blockingGateIds,
    rerunRecommended: blockingGateIds.length > 0,
    history: gates.map((gate) => ({
      gateId: gate.id,
      label: gate.label,
      ownerRoleId: gate.ownerRoleId,
      status: gate.status,
      blocking: gate.blocking,
      summary: gate.summary
    }))
  };
}

function buildArtifacts(
  payload: CreateWorkflowRequest,
  timeline: WorkflowStep[],
  review: ReviewSummary
): WorkflowArtifact[] {
  const gateBlocked =
    review.brandStatus === "需修改" || review.complianceStatus === "需修改";

  return timeline.map((step) => {
    let platform = payload.campaign.primaryPlatform;
    if (step.lane === "distribution" && payload.campaign.secondaryPlatforms.length > 0) {
      platform = payload.campaign.secondaryPlatforms[0] ?? payload.campaign.primaryPlatform;
    }
    if (step.lane === "review") {
      platform = "审核节点";
    }

    const status: WorkflowArtifact["status"] =
      step.roleId === "brandReviewer"
        ? review.brandStatus === "通过"
          ? "approved"
          : "needs_changes"
        : step.roleId === "complianceGuard"
          ? review.complianceStatus === "通过"
            ? "approved"
            : "needs_changes"
          : gateBlocked
            ? "needs_changes"
            : "approved";

    return {
      id: `artifact_${step.id}`,
      title: step.outputTitle,
      kind: artifactKindForLane(step.lane),
      status,
      platform,
      stageId: step.stageId,
      stageName: step.stageName,
      ownerRoleId: step.roleId,
      ownerRoleName: step.roleName,
      summary: step.content,
      skillsUsed: step.skillsUsed
    };
  });
}

function buildTeamSnapshot(roles: ConfiguredRole[]): TeamSnapshot[] {
  return roles.map((role) => {
    const roleInfo = roleMapById.get(role.roleId);
    const agentInfo = agentMapByRoleId.get(role.roleId);
    return {
      roleId: role.roleId,
      displayName: role.displayName,
      lane: roleInfo?.lane ?? "operations",
      enabled: role.enabled,
      responsibility: agentInfo?.mandate ?? roleInfo?.description ?? "未定义职责",
      skillCount: SKILL_LIBRARY.filter((skill) => skill.appliesTo.includes(role.roleId)).length
    };
  });
}

function buildWorkboard(
  template: WorkflowTemplate,
  rolesMap: Map<RoleId, ConfiguredRole>,
  timeline: WorkflowStep[],
  stages: WorkflowStageResult[],
  artifacts: WorkflowArtifact[],
  gates: ReviewGate[],
  supplementalOutputCount = 0
): WorkboardSummary {
  const totalSteps = template.stages.reduce((sum, stage) => {
    return (
      sum +
      stage.steps.filter((step) => {
        const role = rolesMap.get(step.roleId);
        return Boolean(role?.enabled);
      }).length
    );
  }, 0);

  const activeLanes = [...new Set(timeline.map((step) => step.lane))];
  const firstBlockingGate = gates.find((gate) => gate.blocking);
  const recommendedFocus = firstBlockingGate
    ? `优先处理${firstBlockingGate.label}中的阻塞问题，再决定是否继续上线或扩量。`
    : artifacts.length === 0
      ? "当前尚未形成可交付资产，建议先完成核心策略和内容产出。"
      : "当前没有硬性阻塞，建议进入试投、投后监测和素材迭代阶段。";

  return {
    totalSteps,
    completedSteps: timeline.length,
    completedStages: stages.length,
    gateBlockers: gates.filter((gate) => gate.blocking).length,
    activeLanes,
    outputCount: artifacts.length + supplementalOutputCount,
    recommendedFocus
  };
}

function buildDeliverables(
  payload: CreateWorkflowRequest,
  timeline: WorkflowStep[]
): Deliverables {
  const strategyStep = findStepByRole(timeline, "strategyLead");
  const contentSteps = findStepsByRole(timeline, "contentPlanner");
  const channelSteps = [
    ...findStepsByRole(timeline, "channelOperator"),
    ...findStepsByRole(timeline, "martechOperator")
  ];
  const analyticsStep = findStepByRole(timeline, "dataAnalyst");
  const knowledgeStep = findStepByRole(timeline, "knowledgeManager");

  const strategySummary =
    strategyStep?.content ??
    `围绕「${payload.campaign.projectName}」，建议以${payload.campaign.targetAudience}为核心人群，优先在${payload.campaign.primaryPlatform}验证内容叙事和转化路径，并把「${payload.campaign.productProofPoints[0] ?? payload.campaign.productName}」作为首要卖点。`;

  const contentAssets =
    contentSteps.length > 0
      ? contentSteps.map((step, index) => ({
          title: `${payload.campaign.primaryPlatform} 内容资产 ${index + 1}`,
          platform:
            index === 0
              ? payload.campaign.primaryPlatform
              : payload.campaign.secondaryPlatforms[index - 1] ??
                payload.campaign.primaryPlatform,
          summary: step.content,
          ownerRoleId: step.roleId
        }))
      : [
          {
            title: `${payload.campaign.primaryPlatform} 核心内容方向`,
            platform: payload.campaign.primaryPlatform,
            summary: "建议围绕痛点场景、产品证明和转化收口三类内容展开。",
            ownerRoleId: "contentPlanner" as const
          }
        ];

  const channelActions =
    channelSteps.length > 0
      ? channelSteps.map((step) => step.content)
      : [
          `优先在 ${payload.campaign.primaryPlatform} 启动试投，并根据首轮互动与转化反馈决定是否向次平台扩散。`
        ];

  const measurementPlan =
    analyticsStep?.content
      .split(/[。；\n]/)
      .map((line) => line.trim())
      .filter((line) => line.length > 8)
      .slice(0, 4) ?? [];

  const normalizedMeasurementPlan =
    measurementPlan.length > 0
      ? measurementPlan
      : [
          `围绕 ${payload.campaign.kpis} 建立曝光、互动、点击和转化四层监测。`,
          "按素材、人群和渠道拆分报表，确保可以快速定位高低表现原因。"
        ];

  const knowledgeCards =
    knowledgeStep?.content
      .split(/[。；\n]/)
      .map((line) => line.trim())
      .filter((line) => line.length > 8)
      .slice(0, 4) ?? [];

  return {
    strategySummary,
    audienceInsights: buildAudienceInsights(payload),
    competitorInsights: buildCompetitorInsights(payload),
    platformPlaybooks: buildPlatformPlaybooks(payload, timeline),
    platformAssets: buildPlatformAssets(payload, timeline),
    contentMatrix: buildContentMatrix(payload, timeline),
    contentAssets,
    channelActions,
    measurementPlan: normalizedMeasurementPlan,
    knowledgeCards:
      knowledgeCards.length > 0
        ? knowledgeCards
        : [
            "沉淀高表现内容模板、渠道节奏与风险清单，作为后续项目默认起点。",
            "把审核中发现的问题整理成禁用表达库，减少重复返工。"
          ]
  };
}

function collectWarnings(roles: ConfiguredRole[]): string[] {
  const warnings: string[] = [];

  for (const requiredRoleId of REQUIRED_ROLE_IDS) {
    const found = roles.find((role) => role.roleId === requiredRoleId);
    if (!found || !found.enabled) {
      warnings.push(`必选角色 ${requiredRoleId} 未启用，系统无法完成完整审核闭环。`);
    }
  }

  for (const role of roles) {
    if (role.model.mode === "openai" && !role.model.baseUrl) {
      warnings.push(
        `${role.displayName} 处于 OpenAI 兼容模式但未配置 baseUrl，已自动使用模拟输出。`
      );
    }
  }

  return warnings;
}

function resolveTemplate(payload: CreateWorkflowRequest): WorkflowTemplate {
  if (payload.templateId === "custom") {
    if (!payload.customTemplate) {
      throw new Error("templateId=custom 时缺少 customTemplate");
    }

    return {
      id: "custom",
      name: payload.customTemplate.name,
      description: payload.customTemplate.description,
      focus: ["自定义流程"],
      stages: payload.customTemplate.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        description: stage.description,
        defaultStageSeconds: stage.defaultStageSeconds,
        steps: stage.steps.map((step) => ({
          roleId: step.roleId,
          intent: step.intent,
          outputTitle: step.outputTitle,
          skillIds: step.skillIds ?? [],
          stepSeconds: step.stepSeconds
        }))
      }))
    };
  }

  return WORKFLOW_TEMPLATES[payload.templateId];
}

function cloneStep(step: WorkflowStep): WorkflowStep {
  return { ...step, skillsUsed: [...step.skillsUsed] };
}

function cloneStage(stage: WorkflowStageResult): WorkflowStageResult {
  return {
    ...stage,
    steps: stage.steps.map(cloneStep)
  };
}

function resolveStartStageId(
  template: WorkflowTemplate,
  startStageId?: string,
  startRoleId?: RoleId
): string | null {
  if (startStageId) {
    return startStageId;
  }

  if (!startRoleId) {
    return null;
  }

  const stage = template.stages.find((item) =>
    item.steps.some((step) => step.roleId === startRoleId)
  );
  return stage?.id ?? null;
}

function sanitizeRoles(roles: ConfiguredRole[]): ConfiguredRole[] {
  return roles.map((role) => ({
    ...role,
    model: {
      ...role.model,
      apiKey: role.model.apiKey ? "***" : ""
    }
  }));
}

async function emitEvent(hooks: WorkflowRunHooks, event: WorkflowStreamEvent) {
  if (!hooks.onEvent) {
    return;
  }
  await hooks.onEvent(event);
}

export async function runWorkflow(
  payload: CreateWorkflowRequest,
  hooks: WorkflowRunHooks = {},
  options: WorkflowRunOptions = {}
): Promise<WorkflowRun> {
  const template = resolveTemplate(payload);
  const rolesMap = new Map(payload.roles.map((role) => [role.roleId, role] as const));
  const team = buildTeamSnapshot(payload.roles);
  const resolvedStartStageId = resolveStartStageId(
    template,
    options.startStageId,
    options.startRoleId
  );
  const rerunMode = options.rerunMode ?? "full";

  if (rerunMode !== "full" && !resolvedStartStageId) {
    throw new Error("无法解析定向重跑起点，请检查 stageId 或 roleId 是否有效。");
  }

  const runId = `workflow_${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  const meta: WorkflowMeta = {
    id: runId,
    createdAt,
    projectName: payload.campaign.projectName,
    templateId: payload.templateId,
    templateName: template.name,
    objective: payload.campaign.objective,
    primaryPlatform: payload.campaign.primaryPlatform
  };

  const timeline: WorkflowStep[] = [];
  const stages: WorkflowStageResult[] = [];
  const warnings = collectWarnings(payload.roles);

  let currentSecond = 0;
  let sequence = 1;
  let stagePlansToRun = template.stages;

  if (resolvedStartStageId && options.previousRun) {
    const startStageIndex = template.stages.findIndex((stage) => stage.id === resolvedStartStageId);
    if (startStageIndex < 0) {
      throw new Error(`找不到重跑起点环节：${resolvedStartStageId}`);
    }

    const prefixStageIds = new Set(template.stages.slice(0, startStageIndex).map((stage) => stage.id));
    const prefixStages = options.previousRun.stages
      .filter((stage) => prefixStageIds.has(stage.id))
      .map(cloneStage);
    const prefixTimeline = options.previousRun.timeline
      .filter((step) => prefixStageIds.has(step.stageId))
      .map(cloneStep);

    timeline.push(...prefixTimeline);
    stages.push(...prefixStages);
    currentSecond = prefixTimeline[prefixTimeline.length - 1]?.endedAtSecond ?? 0;
    sequence = prefixTimeline.length + 1;
    stagePlansToRun = template.stages.slice(startStageIndex);
    warnings.push(
      `本次工作流从环节 ${resolvedStartStageId} 开始重跑，上游产物沿用 ${options.previousRun.id}。`
    );
  }

  await emitEvent(hooks, {
    type: "meta",
    payload: meta
  });

  let reachedLimit = false;

  for (const stagePlan of stagePlansToRun) {
    if (reachedLimit) {
      break;
    }

    const stageAllocatedSeconds =
      payload.workflowControl.stageSeconds[stagePlan.id] ?? stagePlan.defaultStageSeconds;

    const stageSteps: WorkflowStep[] = [];
    let stageActualSeconds = 0;
    let stageOvertimeSeconds = 0;

    await emitEvent(hooks, {
      type: "stage_start",
      payload: {
        id: stagePlan.id,
        name: stagePlan.name,
        description: stagePlan.description,
        allocatedSeconds: stageAllocatedSeconds
      }
    });

    for (const stepPlan of stagePlan.steps) {
      if (currentSecond >= payload.workflowControl.totalSeconds) {
        reachedLimit = true;
        warnings.push("达到工作流总时长上限，后续步骤被提前终止。");
        break;
      }

      const role = rolesMap.get(stepPlan.roleId);
      if (!role || !role.enabled) {
        continue;
      }

      const roleInfo = roleMapById.get(role.roleId);
      if (!roleInfo) {
        continue;
      }

      const roleStepOverride = payload.workflowControl.roleStepSeconds[stepPlan.roleId];
      const allocatedSeconds = clamp(
        stepPlan.stepSeconds ?? roleStepOverride ?? payload.workflowControl.defaultStepSeconds,
        10,
        360
      );
      const remainingTotal = payload.workflowControl.totalSeconds - currentSecond;
      const allowedSeconds = Math.max(10, Math.min(allocatedSeconds, remainingTotal));
      const skillsUsed = stepPlan.skillIds ?? [];

      const generation = await generateText({
        roleId: role.roleId,
        roleLabel: role.displayName,
        campaign: payload.campaign,
        intent: stepPlan.intent,
        outputTitle: stepPlan.outputTitle,
        skillIds: skillsUsed,
        model: role.model,
        baseSystemPrompt: `${roleInfo.defaultPrompt}\n${role.model.systemPrompt ?? ""}`.trim(),
        contextLines: summarizeRecentSteps(timeline)
      });

      const safeContent = generation.text.trim() || `${role.displayName}：本轮暂无可输出内容。`;
      const estimatedSeconds = estimateOutputSeconds(safeContent);
      const overtimeSeconds = Math.max(0, estimatedSeconds - allowedSeconds);
      const shortened = shortenToSeconds(safeContent, allowedSeconds);
      const finalEstimatedSeconds = estimateOutputSeconds(shortened.text);
      const actualSeconds = Math.min(finalEstimatedSeconds, allowedSeconds);

      const step: WorkflowStep = {
        id: `step_${sequence}`,
        sequence,
        stageId: stagePlan.id,
        stageName: stagePlan.name,
        roleId: role.roleId,
        roleName: role.displayName,
        lane: roleInfo.lane,
        intent: stepPlan.intent,
        outputTitle: stepPlan.outputTitle,
        skillsUsed,
        allocatedSeconds: allowedSeconds,
        estimatedSeconds: finalEstimatedSeconds,
        overtimeSeconds,
        wasTruncated: shortened.truncated,
        startedAtSecond: currentSecond,
        endedAtSecond: currentSecond + actualSeconds,
        content: shortened.text,
        source: generation.source,
        model: generation.model,
        error: generation.error
      };

      timeline.push(step);
      stageSteps.push(step);
      sequence += 1;
      currentSecond += actualSeconds;
      stageActualSeconds += actualSeconds;
      stageOvertimeSeconds += overtimeSeconds;

      await emitEvent(hooks, {
        type: "step",
        payload: step
      });
    }

    const stageResult: WorkflowStageResult = {
      id: stagePlan.id,
      name: stagePlan.name,
      description: stagePlan.description,
      allocatedSeconds: stageAllocatedSeconds,
      actualSeconds: stageActualSeconds,
      overtimeSeconds: stageOvertimeSeconds,
      steps: stageSteps
    };

    stages.push(stageResult);

    await emitEvent(hooks, {
      type: "stage_end",
      payload: stageResult
    });
  }

  const review = buildReviewSummary(payload, timeline);
  const gates = buildReviewGates(timeline, review);
  const approval = buildApprovalState(gates);
  const artifacts = buildArtifacts(payload, timeline, review);
  const deliverables = buildDeliverables(payload, timeline);
  const board = buildWorkboard(
    template,
    rolesMap,
    timeline,
    stages,
    artifacts,
    gates,
    deliverables.platformAssets.length
  );
  const totalAllocatedSeconds = stages.reduce((sum, stage) => sum + stage.allocatedSeconds, 0);
  const totalActualSeconds = stages.reduce((sum, stage) => sum + stage.actualSeconds, 0);
  const totalOvertimeSeconds = stages.reduce((sum, stage) => sum + stage.overtimeSeconds, 0);

  const run: WorkflowRun = {
    id: runId,
    createdAt,
    rerunOf: options.rerunOf ?? null,
    rerunContext: {
      mode: rerunMode,
      sourceWorkflowId: options.rerunOf ?? null,
      startStageId: resolvedStartStageId ?? undefined,
      startRoleId: options.startRoleId,
      note:
        rerunMode === "full"
          ? "整单重跑，重新生成全部环节。"
          : rerunMode === "stage"
            ? `从环节 ${resolvedStartStageId ?? "-"} 开始重跑，保留上游结果。`
            : `从角色 ${options.startRoleId ?? "-"} 首次出现的环节开始重跑，保留上游结果。`
    },
    campaign: payload.campaign,
    templateId: payload.templateId,
    templateName: template.name,
    workflowControl: payload.workflowControl,
    roles: sanitizeRoles(payload.roles),
    team,
    stages,
    timeline,
    artifacts,
    gates,
    approval,
    board,
    review,
    deliverables,
    totalAllocatedSeconds,
    totalActualSeconds,
    totalOvertimeSeconds,
    warnings
  };

  await emitEvent(hooks, {
    type: "done",
    payload: run
  });

  return run;
}
