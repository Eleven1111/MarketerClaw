# MarketerClaw

**EN** · A marketing operations skill pack for [OpenClaw](https://openclaw.ai). Describe your campaign in plain language — the system runs a professional workflow and outputs ready-to-distribute markdown docs. No forms, no dashboards, no model setup required.

**中文** · 运行在 [OpenClaw](https://openclaw.ai) 上的营销作战技能包。用自然语言描述 campaign，系统按专业流程产出可直接分发的作战文档。不需要表单，不需要独立服务器，不需要配模型。

支持国内市场、海外市场和跨境双线作战。

---

## 安装 · Install

```bash
curl -fsSL https://raw.githubusercontent.com/Eleven1111/MarketerClaw/main/install.sh | bash
```

安装到指定 workspace / Install to a specific workspace:

```bash
curl -fsSL https://raw.githubusercontent.com/Eleven1111/MarketerClaw/main/install.sh | bash -s /path/to/your/workspace
```

安装到当前目录 / Install to current directory:

```bash
curl -fsSL https://raw.githubusercontent.com/Eleven1111/MarketerClaw/main/install.sh | bash -s -- --local
```

## 升级 · Upgrade

```bash
curl -fsSL https://raw.githubusercontent.com/Eleven1111/MarketerClaw/main/install.sh | bash
```

> ⚠️ 升级会覆盖所有 `SKILL.md` 文件。如果你修改过技能内容，请先备份。
> `campaigns/` 目录（你的产出文件）不会被触碰。
>
> Upgrade overwrites all `SKILL.md` files. Back up any local edits first.
> Your `campaigns/` outputs are never touched.

## 技能一览 · Skills

| 技能 | EN | 用途 | 独立可用 |
|------|----|------|---------|
| `mc-insight` | Insight | 文化洞察（时代情绪/圈层文化/地域差异/文化时机/表达领土/踩雷预警） | ✅ |
| `mc-product` | Product | 造品（需求空白/差异化策略/产品定义/体验设计/命名包装/产品线架构） | ✅ |
| `mc-aigc` | AIGC | AI内容生成（图片/视频Prompt体系/品牌视觉系统/素材矩阵/Midjourney/Kling/Runway） | ✅ |
| `mc-selection` | Selection | 选品决策（热度信号/需求验证/竞争饱和度/利润模型/平台适配/供应链/合规/营销可行性） | ✅ |
| `mc-campaign` | Campaign | 全流程作战编排（brief → 策略 → 内容 → 渠道 → 审核） | ✅ |
| `mc-research` | Research | 市场调研（行业趋势/品类机会/人群洞察/搜索热度/社媒声量） | ✅ |
| `mc-content` | Content | 单平台内容生产（国内 6 + 海外 10 个平台） | ✅ |
| `mc-geo` | GEO | GEO 优化（AI 搜索引擎可见性/内容可引用性/Schema/品牌提及监控） | ✅ |
| `mc-automation` | Automation | 营销自动化（客户生命周期/触发式工作流/Lead Scoring/多渠道编排） | ✅ |
| `mc-dtc` | DTC | 海外独立站全栈蓝图（建站/转化/引流/支付物流/本地化/数据/合规） | ✅ |
| `mc-analytics` | Analytics | 数据分析与诊断（漏斗诊断/归因/预算优化/A·B测试/异常检测/预测/看板） | ✅ |
| `mc-review` | Review | 品牌调性 + 多法域合规双审（广告法/FTC/ASA/GDPR/景品表示法） | ✅ |
| `mc-seo` | SEO | 搜索引擎优化（关键词研究/页面SEO/技术SEO/外链/内容SEO/Amazon/百度/国际化） | ✅ |
| `mc-compete` | Compete | 竞品情报分析（去重/分类/威胁评估/应对建议） | ✅ |
| `mc-report` | Report | Campaign 复盘与周报 | ✅ |

每个技能都可以独立使用，也可以通过 `mc-campaign` 串联执行。

Each skill works standalone or can be orchestrated end-to-end via `mc-campaign`.

---

## WebUI

A clean SaaS-style dashboard for real-time visibility into agent execution.

```bash
cd webui
npm install
npm run dev   # http://localhost:3000
```

**Features:**
- Campaign list with workflow progress
- 12-step pipeline visualization with live status
- Markdown file viewer for all generated outputs
- Agent console with real-time execution log
- SSE-based live status updates (no manual refresh)

---

## 使用示例 · Usage Examples

### 国内 Campaign

```
新品上市，产品是轻养零糖茶，目标人群 25-35 岁都市女性白领，
主平台小红书，辅助抖音和微信，预算 20-30 万，
目标是首月声量破圈和首批转化。
```

### Cross-border Campaign

```
We're launching a DTC skincare brand in the US market,
target audience is Gen Z women 18-25, main platforms TikTok + Instagram,
budget $50K, goal is 1000 orders in the first month.
```

### 双线作战 · Dual-market

```
跨境美妆品牌，国内主打小红书和抖音，海外主打 TikTok 和 Instagram，
目标人群国内 25-35 都市女性 + 海外 Gen Z，
国内预算 30 万 + 海外 $50K。
```

### 单独使用 · Standalone

```
帮我调研一下美国即饮茶市场的趋势和机会
```
```
我们品牌在 Perplexity 搜索结果里完全看不到，怎么优化？
```
```
帮我设计一套购后跟进 + 流失召回的自动化流程
```
```
我们要做一个美国市场的 DTC 独立站，Shopify 还是 Headless？帮我出个完整方案
```
```
广告转化率从 2.1% 掉到 0.8%，帮我诊断一下哪个环节出了问题
```
```
这两个落地页的 A/B 测试跑了一周，数据给你，帮我看看能不能下结论
```
```
这段 Amazon listing 帮我审一下 FTC 合规
```
```
看看这几个竞品在干什么：Brand A 在 TikTok 铺 UGC，Brand B 在 Amazon 打价格战
```

---

## 产出结构 · Output Structure

```
campaigns/skincare-dtc-us-launch/
├── brief.md
├── research.md
├── strategy.md
├── geo.md
├── automation.md
├── dtc.md
├── analytics.md
├── content/
│   ├── TikTok.md
│   ├── Instagram.md
│   └── YouTube.md
├── channel.md
├── compete.md
├── review.md
└── report.md
```

每个文件独立 markdown，可直接发给对应团队成员。

Each file is standalone markdown — hand directly to the relevant team member.

---

## 工作流程 · Workflow

```
市场调研 (mc-research) ──────────────────────────────────┐
                                                          │
用户输入 brief ──▶ 需求分诊 ──▶ 策略规划                    │
                               │                          │
                ┌──────────────┼──────────────┬──────────┘
                ▼              ▼              ▼
            内容生产        GEO 优化       营销自动化 / 独立站蓝图
            content/*       geo.md        automation.md / dtc.md
                └──────────────┼──────────────┘
                               ▼
                           渠道排布 ──▶ 品牌+合规双审 ──▶ 数据分析 / 复盘
```

- 可在任意步骤暂停 / Pause at any step
- 可单步重跑 / Re-run any single step
- 可随时补充信息 / Add context anytime

---

## 平台覆盖 · Platform Coverage

### 国内 / Domestic

小红书 · 抖音 · 微信 · 微博 · B站 · 私域 · 百度 SEO

### 海外 / Overseas

Instagram · TikTok · YouTube · Facebook · X · Pinterest · LinkedIn · Amazon · Google Ads · Email

### 合规法域 / Compliance Jurisdictions

中国广告法 · 美国 FTC · 英国 ASA/CAP · 欧盟 GDPR · 日本景品表示法 · 韩国表示广告法 · 东南亚各国

---

## 设计原则 · Design Principles

1. **对话即界面 / Conversation as interface** — 不需要表单，不需要 dashboard
2. **文件即交付 / Files as deliverables** — 每个 markdown 可直接发给团队成员
3. **增量执行 / Incremental execution** — 不必一次跑完全流程
4. **零配置 / Zero configuration** — OpenClaw 已处理好模型配置
5. **全球市场原生 / Global-native** — 国内 + 海外 + 多法域，一套技能包覆盖
