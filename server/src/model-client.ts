import type { RoleId } from "./catalog.js";
import type { CampaignContext, RoleModelConfig } from "./types.js";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ModelGenerationResult = {
  text: string;
  source: "api" | "mock" | "fallback";
  model: string;
  error?: string;
};

export type GenerateTextInput = {
  roleId: RoleId;
  roleLabel: string;
  campaign: CampaignContext;
  intent: string;
  outputTitle: string;
  skillIds: string[];
  model: RoleModelConfig;
  baseSystemPrompt: string;
  contextLines: string[];
};

type ApiProvider = "openai" | "google" | "volcengine";

type ResolvedProviderConfig = {
  provider: ApiProvider;
  endpointBase: string;
};

type RuntimeProviderConfig = RoleModelConfig;

function hashText(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickBySeed(items: string[], seed: number): string {
  if (items.length === 0) {
    return "";
  }
  return items[seed % items.length] ?? "";
}

function toSingleLine(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
}

function platformGuidance(platform: string): string {
  if (platform.includes("小红书")) {
    return "小红书内容要强调真实体验、标题钩子、封面视觉和搜索友好表达。";
  }
  if (platform.includes("抖音")) {
    return "抖音内容要强调前 3 秒钩子、强节奏脚本、口播感和转化动作。";
  }
  if (platform.includes("微信")) {
    return "微信生态内容要强调长文结构、私域承接、社群转化和信任建立。";
  }
  if (platform.includes("微博")) {
    return "微博内容要强调热点挂钩、话题性和舆情扩散效率。";
  }
  if (platform.includes("B站")) {
    return "B站内容要强调测评深度、故事完整度和评论区互动。";
  }
  return `${platform} 的内容要优先匹配该平台的浏览习惯、互动机制和分发逻辑。`;
}

function buildMockOutput(input: GenerateTextInput): string {
  const { campaign } = input;
  const proof1 = campaign.productProofPoints[0] ?? `${campaign.productName} 的核心使用价值`;
  const proof2 = campaign.productProofPoints[1] ?? `${campaign.productName} 的差异化体验`;
  const primaryPlatform = campaign.primaryPlatform;
  const secondaryPlatformList =
    campaign.secondaryPlatforms.slice(0, 2).join("、") || "次级平台待确认";
  const competitor1 = (campaign.competitorEntries ?? [])[0];
  const competitor2 = (campaign.competitorEntries ?? [])[1];
  const competitorLine1 = competitor1
    ? `${competitor1.competitor} 在 ${competitor1.platform} 主打「${competitor1.messageAngle}」，可攻击点：${competitor1.weakness}。`
    : campaign.competitorNotes[0] ?? "建议补充竞品动作，以确立差异化叙事基线。";
  const competitorLine2 = competitor2
    ? `${competitor2.competitor} 在 ${competitor2.platform} 推进「${competitor2.move}」，${competitor2.weakness}。`
    : "建议补充第二竞品动作，形成完整竞争格局判断。";

  switch (input.roleId) {
    case "briefDesk":
      return [
        `【需求分诊台 · ${input.outputTitle}】`,
        ``,
        `项目「${campaign.projectName}」已完成 brief 归一化：`,
        `· 目标：${campaign.objective}`,
        `· 人群：${campaign.targetAudience}`,
        `· 主平台：${primaryPlatform} | 次级平台：${secondaryPlatformList}`,
        `· 活动窗口：${campaign.campaignWindow} | 重点区域：${campaign.regionFocus}`,
        `· 预算：${campaign.budgetRange} | KPI：${campaign.kpis}`,
        ``,
        `信息缺口：`,
        `· 达人合作名单是否已有？会影响渠道节奏设计。`,
        `· 产品证明素材（评测/成分/用户反馈）是否已备？会影响内容可信度。`,
        `· 风险边界：${
          campaign.riskNotes ||
          "尚未填写——建议明确广告法红线和平台规则限制，否则合规审查无参照标准。"
        }`,
      ].join("\n");

    case "strategyLead":
      return [
        `【策略负责人 · ${input.outputTitle}】`,
        ``,
        `核心传播主张：以「${proof1}」为第一叙事锚点，切入 ${campaign.targetAudience} 的真实使用痛点，再用「${proof2}」回答「为什么选它」。`,
        ``,
        `竞品差异化：`,
        `· ${competitorLine1}`,
        `· ${competitorLine2}`,
        `· 建议围绕竞品弱点做「真实体验证据」路线，用细节建立不可复制的信任感。`,
        ``,
        `阶段节奏：`,
        `1. 预热期：KOC 种草 + 关键词卡位，建立品类认知`,
        `2. 引爆期：达人联动 + 平台付费，快速覆盖目标人群`,
        `3. 收口期：活动钩子 + 私域沉淀，把声量转化为首批成交`,
        ``,
        `调性要求：全程执行「${campaign.brandTone}」，让每条内容都让 ${campaign.targetAudience} 感觉「说的是我」。`,
      ].join("\n");

    case "contentPlanner":
      return [
        `【内容策划 · ${input.outputTitle}】`,
        ``,
        `内容矩阵（三层结构）：`,
        ``,
        `第一层：认知钩子（${primaryPlatform} 优先）`,
        `· 角度A：「${campaign.targetAudience} 用了 ${campaign.productName} 后的真实变化」——场景纪录风`,
        `· 角度B：「为什么我放弃了 ${competitor1?.competitor ?? "竞品"}，选了 ${campaign.productName}」——对比种草风`,
        `· 钩子示例：「身为 ${campaign.targetAudience}，你有没有遇到过...」`,
        ``,
        `第二层：信任建立（${primaryPlatform} + ${secondaryPlatformList}）`,
        `· 核心支撑：「${proof1}」——用具体细节而非口号式表达`,
        `· 达人建议：中腰部 KOC 优先于头部 KOL，信任感更强、成本更可控`,
        ``,
        `第三层：转化收口`,
        `· CTA 组合：收藏笔记 + 评论区关键词 + 主页转化入口`,
        `· 利益设计：结合「${campaign.budgetRange}」预算，设计首购或限时体验入口`,
        ``,
        `语气：全程「${campaign.brandTone}」，用场景细节代替口号，严禁绝对化用语。`,
      ].join("\n");

    case "channelOperator":
      return [
        `【渠道投放 · ${input.outputTitle}】`,
        ``,
        `节奏：预热（D-7）-> 引爆（D-3 至活动日）-> 收口（最后 24 小时）`,
        ``,
        `主平台 ${primaryPlatform}：`,
        `· 预热铺 3-5 篇 KOC 种草，覆盖核心搜索词`,
        `· 引爆期开启信息流 + 搜索广告，配合 KOL 联动`,
        `· 约束：${
          campaign.channelConstraints ||
          "暂无特殊约束，建议备好 AB 素材快速测试完播率和点击率。"
        }`,
        ``,
        `次级平台 ${secondaryPlatformList}：`,
        `· 复用主平台高表现素材，适配格式后分发，承接搜索流量做转化补位`,
        ``,
        `KPI 监测：`,
        `· 每日早会前过数据（曝光/互动/点击/转化），波动超 20% 当天调整`,
        `· 围绕「${campaign.kpis}」设每周 checkpoint，决定追加或暂停预算`,
      ].join("\n");

    case "brandReviewer":
      return [
        `【品牌审校 · ${input.outputTitle}】`,
        ``,
        `结论：通过（附修改建议）`,
        ``,
        `发现：`,
        `· 整体语气与「${campaign.brandTone}」方向基本吻合，「${proof1}」传递较为清晰。`,
        `· 部分 CTA 有强促销感（"立即抢购"类），与品牌定调有冲突。`,
        `· 「${proof2}」在内容中出现频率不足，应在种草层补充更多场景细节。`,
        ``,
        `修改建议：`,
        `· 把"限时/立即"类 CTA 调整为「查看完整体验」「了解更多」，保留转化入口同时降低销售感。`,
        `· 品牌调性中的「可信赖」需通过细节证明，而不是直接说出来。`,
        `· 建议在 1-2 篇种草内容中加入真实用户视角的使用细节。`,
      ].join("\n");

    case "complianceGuard":
      return [
        `【合规审查 · ${input.outputTitle}】`,
        ``,
        `结论：通过（附风险提示）`,
        ``,
        `风险项（中等风险，需发布前逐条核对）：`,
        `· 「效果、改善、修复、立刻见效」等词汇需替换为可量化或可验证的说法。`,
        `· 大促划线价须有历史销售凭证，否则违反《广告法》第28条（虚假原价）。`,
        `· 风险边界参考：${
          campaign.riskNotes ||
          "当前未填写风险边界——合规审查缺少参照标准，建议补充禁用词清单。"
        }`,
        ``,
        `平台规则：`,
        `· ${primaryPlatform}：正文中禁止出现联系方式（手机号/微信号），违规将限流或删帖。`,
        `· 健康/美妆功效——须避免「治疗、修复、临床验证」等医疗类词汇（非注册医疗产品禁用）。`,
        ``,
        `建议：正式发布前由具备资质的法务人员逐条复核，不建议仅依赖本系统输出直接上线。`,
      ].join("\n");

    case "dataAnalyst":
      return [
        `【数据分析 · ${input.outputTitle}】`,
        ``,
        `KPI 框架（基于「${campaign.kpis}」）：`,
        `· 曝光/内容层：互动率（点赞+收藏+评论/曝光），行业参考值 3-8%`,
        `· 点击/意向层：商品详情页点击率，判断内容激发购买意愿的能力`,
        `· 转化层：首购率/留资率，直接关联「${campaign.objective}」`,
        ``,
        `预算分配建议（基于「${campaign.budgetRange}」量级）：`,
        `· 约 40%：内容生产与 KOC/KOL 合作（种草）`,
        `· 约 35%：平台付费推广（信息流/搜索，引爆期集中投入）`,
        `· 约 15%：AB 测试预算（快速测试素材与人群包）`,
        `· 约 10%：弹性预算（追加高表现素材）`,
        ``,
        `复盘节点：活动第3天、第7天和结束后48小时内各做一次数据回顾，按信号快速调整分配。`,
      ].join("\n");

    case "martechOperator":
      return [
        `【营销自动化 · ${input.outputTitle}】`,
        ``,
        `链路配置：`,
        `· 落地页：UTM 参数完整区分来源（${primaryPlatform} / ${secondaryPlatformList}），实现跨平台归因`,
        `· 表单：字段精简（姓名 + 手机 + 意向等级），字段过多会显著降低提交率`,
        ``,
        `自动化流程（优先级排序）：`,
        `1. 提交表单后 5 分钟内发送欢迎语 + 核心资料（企业微信/短信）`,
        `2. 72 小时未互动推送一次干货内容（不直接促销）`,
        `3. 活动结束前 24 小时发送倒计时提醒含明确利益点`,
        ``,
        `数据闭环：平台广告账户与 CRM 打通，实现从内容点击到成交的全链路归因，为下次决策提供数据支撑。`,
      ].join("\n");

    case "knowledgeManager":
      return [
        `【知识运营 · ${input.outputTitle}】`,
        ``,
        `本次可沉淀的四类团队资产：`,
        ``,
        `1. 内容模板库`,
        `   · 提炼「${primaryPlatform}」高互动内容结构（钩子 + 产品证明 + CTA 动作）`,
        `   · 按角度分类：对比种草型 / 场景纪录型 / 达人评测型`,
        ``,
        `2. 人群洞察卡`,
        `   · 记录「${campaign.targetAudience}」的触媒偏好、高互动话题和语言习惯`,
        ``,
        `3. 风险禁用词清单`,
        `   · 整理合规审查发现的问题成为禁用表达库，所有成员写内容前对照一遍`,
        ``,
        `4. 复盘卡片（一页纸）`,
        `   · 结构：目标/结果/成功因子/问题/下次实验方向`,
        `   · 归档至团队知识库，作为下次类似项目的默认参考起点`,
      ].join("\n");

    default:
      return [
        `【${input.roleLabel} · ${input.outputTitle}】`,
        ``,
        `当前任务：${input.intent}`,
        `· 对照「${campaign.objective}」确认每条产出直接服务于核心指标`,
        `· 输出前做品牌调性和合规自查，避免返工`,
      ].join("\n");
  }
}

        `内容矩阵（三层结构）：`,
        ``,
        `▸ 第一层：认知钩子（${primaryPlatform} 优先发布）`,
        `  · 角度A：「${campaign.targetAudience} 使用 ${campaign.productName} 的真实变化」——场景纪录风，重真实不求完美`,
        `  · 角度B：「为什么放弃了 ${competitor1?.competitor ?? "竞品"}，选了 ${campaign.productName}」——对比种草风，突出可攻击弱点`,
        `  · 钩子示例：「身为 ${campaign.targetAudience}，你有没有遇到过...」`,
        ``,
        `▸ 第二层：信任建立（${primaryPlatform} + ${secondaryPlatformList}）`,
        `  · 核心支撑：「${proof1}」——用具体细节而非口号式表达`,
        `  · 达人建议：中腰部 KOC 优先于头部 KOL，信任感更强、成本更可控`,
        ``,
        `▸ 第三层：转化收口`,
        `  · CTA 组合：收藏笔记 + 评论区关键词 + 主页转化入口，分层承接不同意向用户`,
        `  · 利益设计：结合「${campaign.budgetRange}」，设计首购体验或限时优惠入口`,
        ``,
        `语气要求：全程「${campaign.brandTone}」，用场景细节代替口号，严禁绝对化用语。`,
      ].join("
");

    case "channelOperator":
      return [
        `【渠道投放 · ${input.outputTitle}】`,
        ``,
        `节奏：预热（D-7）→ 引爆（D-3 至活动日）→ 收口（最后 24 小时）`,
        ``,
        `主平台 ${primaryPlatform} 动作：`,
        `· 预热：铺 3-5 篇 KOC 种草，覆盖核心搜索词`,
        `· 引爆：信息流 + 搜索广告同步开启，配合 KOL 联动扩散`,
        `· 约束处理：${campaign.channelConstraints || "暂无特殊约束，建议备好 AB 素材快速测试完播率和点击率。"}`,
        ``,
        `次级平台 ${secondaryPlatformList} 动作：`,
        `· 复用主平台高表现素材，适配格式后分发，主要承接搜索流量做转化补位`,
        ``,
        `KPI 监测：`,
        `· 每日早会前过一遍核心数据（曝光→互动→点击→转化），波动超 20% 当天调整`,
        `· 围绕「${campaign.kpis}」设每周 checkpoint，决定是否追加或暂停预算`,
      ].join("
");

    case "brandReviewer":
      return [
        `【品牌审校 · ${input.outputTitle}】`,
        ``,
        `结论：通过（附修改建议）`,
        ``,
        `发现：`,
        `· 整体语气与「${campaign.brandTone}」方向基本一致，「${proof1}」传递较为清晰。`,
        `· 部分 CTA 有强促销感（"立即抢购"类），与品牌调性存在冲突，建议调整。`,
        `· 「${proof2}」在内容中出现频率不足，建议在种草层补充更多具体使用场景。`,
        ``,
        `修改建议：`,
        `· 把"限时/立即"类 CTA 调整为"查看完整体验/了解更多"，保留转化入口同时降低销售感。`,
        `· "可信赖"等品牌语言需要通过具体细节证明，而非直接说出来。`,
        `· 建议在 1-2 篇种草内容中加入真实用户视角细节，而非功能参数堆砌。`,
      ].join("
");

    case "complianceGuard":
      return [
        `【合规审查 · ${input.outputTitle}】`,
        ``,
        `结论：通过（附高风险提示）`,
        ``,
        `风险项（中等风险，须逐条核对后再上线）：`,
        `· "效果、改善、修复、立刻见效"等词 → 需替换为可量化或可验证的说法。`,
        `· 大促划线价须有历史销售凭证，否则违反《广告法》第28条。`,
        `· 风险边界参考：${campaign.riskNotes || "⚠️ 未填写——合规审查缺少基准，建议补充禁用词清单。"}`,
        ``,
        `平台规则：`,
        `· ${primaryPlatform}：正文中禁止出现联系方式（手机号/微信号），违规将导致限流或删帖。`,
        `· 健康/美妆功效类内容——须避免"治疗、修复、临床验证"等医疗类词汇（非注册医疗产品禁用）。`,
        ``,
        `建议：正式发布前由具备资质的法务人员逐条复核，不建议仅依赖本系统输出直接上线。`,
      ].join("
");

    case "dataAnalyst":
      return [
        `【数据分析 · ${input.outputTitle}】`,
        ``,
        `KPI 框架（基于「${campaign.kpis}」展开）：`,
        `· 曝光/内容层：互动率（点赞+收藏+评论/曝光），行业参考值 3-8%，低于此值需优化选题和钩子`,
        `· 点击/意向层：商品详情页点击率，判断内容能否有效激发购买意愿`,
        `· 转化层：首购率/留资率，直接关联「${campaign.objective}」是否达成`,
        ``,
        `预算分配建议（基于「${campaign.budgetRange}」量级）：`,
        `· 约 40%：内容生产与 KOC/KOL 合作（种草）`,
        `· 约 35%：平台付费推广（信息流/搜索，引爆期集中投入）`,
        `· 约 15%：AB 测试预算（快速测试素材与人群包）`,
        `· 约 10%：弹性预算（追加高表现素材）`,
        ``,
        `复盘节点：活动第3天、第7天和结束后48小时内各做一次数据回顾，按信号快速调整资源分配。`,
      ].join("
");

    case "martechOperator":
      return [
        `【营销自动化 · ${input.outputTitle}】`,
        ``,
        `链路配置建议：`,
        `· 落地页：UTM 参数完整区分来源（${primaryPlatform} / ${secondaryPlatformList}），实现跨平台归因对比`,
        `· 表单：字段精简（姓名 + 手机 + 意向等级），字段越多提交率越低`,
        ``,
        `自动化流程（优先级排序）：`,
        `1. 提交表单 → 5 分钟内发送欢迎语 + 核心资料（企业微信或短信）`,
        `2. 72 小时未互动 → 推送一次干货内容（不直接促销）`,
        `3. 活动结束前 24 小时 → 倒计时提醒，含明确利益点`,
        ``,
        `数据闭环：平台广告账户与 CRM 打通，实现从内容点击到成交的全链路归因，为下次 campaign 决策提供数据支撑。`,
      ].join("
");

    case "knowledgeManager":
      return [
        `【知识运营 · ${input.outputTitle}】`,
        ``,
        `本次可沉淀的四类团队资产：`,
        ``,
        `1. 内容模板库`,
        `   · 提炼「${primaryPlatform}」高互动内容的结构（钩子 + 产品证明 + CTA 动作）`,
        `   · 按角度分类：对比种草型 / 场景纪录型 / 达人评测型`,
        ``,
        `2. 人群洞察卡`,
        `   · 记录「${campaign.targetAudience}」的触媒偏好、高互动话题和语言习惯`,
        ``,
        `3. 风险禁用词清单`,
        `   · 整理合规审查发现的高频问题 → 《禁用表达库》，所有成员写内容前对照一遍`,
        ``,
        `4. 复盘卡片（一页纸）`,
        `   · 结构：目标→结果→成功因子→问题→下次实验方向`,
        `   · 归档至团队知识库，作为下次类似项目的默认参考起点`,
      ].join("
");

    default:
      return [
        `【${input.roleLabel} · ${input.outputTitle}】`,
        ``,
        `当前任务：${input.intent}`,
        `· 对照「${campaign.objective}」确认每条产出直接服务于核心指标`,
        `· 输出前做品牌调性和合规自查，避免返工`,
      ].join("
");
  }
}

function stripEndpointPath(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, "");
  if (!trimmed) {
    return trimmed;
  }

  if (trimmed.endsWith("/chat/completions")) {
    return trimmed.slice(0, -"/chat/completions".length);
  }

  return trimmed;
}

function normalizeOpenAiBase(baseUrl: string): string {
  const stripped = stripEndpointPath(baseUrl);
  if (!stripped) {
    return stripped;
  }

  if (/(\/v\d+)$/.test(stripped)) {
    return stripped;
  }

  return `${stripped}/v1`;
}

function normalizeProviderBase(baseUrl: string): string {
  return stripEndpointPath(baseUrl).replace(/\/$/, "");
}

function fallbackApiKeyForMode(mode: RoleModelConfig["mode"]): string {
  switch (mode) {
    case "openai":
      return process.env.OPENAI_API_KEY?.trim() ?? "";
    case "google":
      return process.env.GOOGLE_API_KEY?.trim() ?? "";
    case "volcengine":
      return process.env.VOLCENGINE_API_KEY?.trim() ?? "";
    default:
      return "";
  }
}

function fallbackModelForMode(mode: RoleModelConfig["mode"]): string {
  switch (mode) {
    case "openai":
      return process.env.OPENAI_MODEL?.trim() ?? "";
    case "google":
      return process.env.GOOGLE_MODEL?.trim() ?? "";
    case "volcengine":
      return process.env.VOLCENGINE_MODEL?.trim() ?? "";
    default:
      return "";
  }
}

function resolveRuntimeConfig(config: RoleModelConfig): RuntimeProviderConfig {
  if (config.mode === "mock") {
    return config;
  }

  const apiKey = config.apiKey.trim() || fallbackApiKeyForMode(config.mode);
  const model = config.model.trim() || fallbackModelForMode(config.mode);
  const baseUrl =
    config.mode === "openai"
      ? config.baseUrl.trim() || process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com"
      : config.baseUrl.trim();

  return {
    ...config,
    apiKey,
    model,
    baseUrl
  };
}

function resolveProviderConfig(config: RuntimeProviderConfig): ResolvedProviderConfig {
  if (config.mode === "openai") {
    const endpointBase = normalizeOpenAiBase(config.baseUrl);
    if (!endpointBase) {
      throw new Error("Missing baseUrl for openai provider");
    }
    return {
      provider: "openai",
      endpointBase
    };
  }

  if (config.mode === "google") {
    const endpointBase =
      normalizeProviderBase(config.baseUrl) ||
      "https://generativelanguage.googleapis.com/v1beta/openai";
    return {
      provider: "google",
      endpointBase
    };
  }

  if (config.mode === "volcengine") {
    const endpointBase =
      normalizeProviderBase(config.baseUrl) || "https://ark.cn-beijing.volces.com/api/v3";
    return {
      provider: "volcengine",
      endpointBase
    };
  }

  throw new Error(`Unsupported model mode: ${config.mode}`);
}

async function callOpenAiCompatible(
  config: RuntimeProviderConfig,
  resolved: ResolvedProviderConfig,
  messages: ChatMessage[]
): Promise<string> {
  const url = `${resolved.endpointBase}/chat/completions`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    };

    if (resolved.provider === "google") {
      headers["x-goog-api-key"] = config.apiKey;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        messages
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `${resolved.provider} request failed (${response.status}): ${body.slice(0, 200)}`
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | Array<{ type?: string; text?: string }>;
        };
      }>;
    };

    const content = payload.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      return content.trim();
    }

    if (Array.isArray(content)) {
      const merged = content
        .map((item) => (typeof item?.text === "string" ? item.text : ""))
        .join("\n")
        .trim();

      if (merged) {
        return merged;
      }
    }

    throw new Error("Model response is empty");
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateText(input: GenerateTextInput): Promise<ModelGenerationResult> {
  const context = input.contextLines.slice(-6).map((line) => `- ${toSingleLine(line)}`);
  const fallbackText = buildMockOutput(input);
  const competitorEntries = (input.campaign.competitorEntries ?? [])
    .slice(0, 4)
    .map(
      (item) =>
        `${item.competitor} / ${item.platform} / 动作:${item.move} / 角度:${item.messageAngle} / 弱点:${item.weakness}`
    );

  const runtimeConfig = resolveRuntimeConfig(input.model);

  if (runtimeConfig.mode === "mock") {
    return {
      text: fallbackText,
      source: "mock",
      model: "mock-marketing-os"
    };
  }

  try {
    if (!runtimeConfig.apiKey) {
      throw new Error(`Missing apiKey for ${runtimeConfig.mode} provider`);
    }

    if (!runtimeConfig.model) {
      throw new Error(`Missing model for ${runtimeConfig.mode} provider`);
    }

    const resolved = resolveProviderConfig(runtimeConfig);
    const responseText = await callOpenAiCompatible(runtimeConfig, resolved, [
      {
        role: "system",
        content: `${input.baseSystemPrompt}\n请使用中文输出，避免空话，结构化给出 3-5 条可执行建议，长度控制在 130-220 字。`
      },
      {
        role: "user",
        content: [
          `项目名称：${input.campaign.projectName}`,
          `产品/服务：${input.campaign.productName}`,
          `营销 brief：${input.campaign.brief}`,
          `目标：${input.campaign.objective}`,
          `目标人群：${input.campaign.targetAudience}`,
          `主平台：${input.campaign.primaryPlatform}`,
          `次平台：${input.campaign.secondaryPlatforms.join("、") || "暂无"}`,
          `投放窗口：${input.campaign.campaignWindow}`,
          `重点区域：${input.campaign.regionFocus}`,
          `品牌调性：${input.campaign.brandTone}`,
          `产品卖点：${input.campaign.productProofPoints.join("、") || "暂无"}`,
          `竞品观察：${input.campaign.competitorNotes.join("、") || "暂无"}`,
          `结构化竞品：${competitorEntries.join("；") || "暂无"}`,
          `渠道约束：${input.campaign.channelConstraints || "暂无"}`,
          `预算范围：${input.campaign.budgetRange}`,
          `KPI：${input.campaign.kpis}`,
          `风险边界：${input.campaign.riskNotes || "暂无"}`,
          `输出要求：${input.campaign.deliverableSpec}`,
          `当前任务：${input.intent}`,
          `当前交付：${input.outputTitle}`,
          `关联 skills：${input.skillIds.join("、") || "暂无"}`,
          "近期上下文：",
          context.length > 0 ? context.join("\n") : "- 暂无",
          "请输出当前步骤的交付内容。"
        ].join("\n")
      }
    ]);

    return {
      text: responseText,
      source: "api",
      model: runtimeConfig.model
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown model error";
    return {
      text: fallbackText,
      source: "fallback",
      model: runtimeConfig.model || "api-fallback",
      error: reason
    };
  }
}
