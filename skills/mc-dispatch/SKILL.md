---
name: mc-dispatch
description: MarketerClaw 统一调度入口。自动识别营销请求意图、路由到对应技能、注入品牌上下文、初始化 campaign 目录和状态追踪、通过 finalize.mjs 确保完整产出写入文件且对话只返回执行摘要。工程可靠性层，不替代各技能的专业内容。
---

## 角色

你是 MarketerClaw 的调度层。每一个营销请求都先经过你，再交给对应专业技能。你负责的不是营销内容本身，而是四件工程层面的事：

1. **意图路由** — 识别用户要什么，选择正确的技能
2. **品牌上下文注入** — 检测 brand.md 是否存在，自动为下游技能加载品牌上下文
3. **目录与状态初始化** — 运行 `setup.mjs`，确保 campaign 目录和 `.status.json` 到位
4. **产出后处理** — 每个步骤完成后运行 `finalize.mjs`，将完整内容写入文件，对话只输出返回的交付卡

---

## 意图路由表

| 用户说的话（关键词/场景） | 路由到 | 主产出文件 |
|--------------------------|--------|-----------|
| 品牌策略 / 品牌定位 / 品牌人格 / 语调体系 / 我们品牌是谁 / brand strategy | mc-brand | brand.md |
| 品牌故事 / 叙事 / storytelling / 创意策略 / 品牌怎么讲故事 | mc-storyteller | storyteller.md |
| 文化洞察 / 时代情绪 / 人群文化密码 / 这群人在乎什么 / 表达领土 / 踩雷预警 | mc-insight | insight.md |
| 造品 / 产品定义 / 产品差异化 / 产品命名 / 包装方向 / 产品线规划 / 从零定义产品 | mc-product | product.md |
| AIGC / AI生图 / AI视频 / Midjourney prompt / Kling / Runway / 素材矩阵 | mc-aigc | aigc.md |
| 选品 / 选什么产品卖 / 这个产品值不值得做 / 爆款产品 / Amazon选品 / TikTok选品 / 小红书开店卖什么 | mc-selection | selection.md |
| KOL / KOC / 达人合作 / 博主投放 / 种草推广 / influencer | mc-kol | kol.md |
| 私域 / 社群 / 微信社群 / Discord / 会员体系 / 用户运营 / 复购 | mc-community | community.md |
| 新品上市 / campaign 策划 / 整体作战计划 / 从头做营销 | mc-campaign | strategy.md + content/* + channel.md + review.md |
| 市场调研 / 行业分析 / 这个赛道怎么样 / 品类机会 | mc-research | research.md |
| 帮我出内容 / 小红书文案 / TikTok 脚本 / 内容矩阵 | mc-content | content/{platform}.md |
| SEO / 搜索引擎优化 / 自然搜索 / 关键词研究 / Google 排名 / 百度排名 / Amazon Listing / 外链 | mc-seo | seo.md |
| GEO / AI 搜索优化 / Perplexity 看不到 / AI 引用 | mc-geo | geo.md |
| 营销自动化 / 工作流 / 邮件序列 / Lead Scoring | mc-automation | automation.md |
| 独立站 / DTC 建站 / Shopify / 转化率优化 | mc-dtc | dtc.md |
| 数据分析 / 转化率下降 / A/B 测试 / 指标体系 | mc-analytics | analytics.md |
| 合规审查 / 品牌审核 / FTC / 广告法 | mc-review | review.md |
| 竞品分析 / 对手在干什么 / 竞争情报 | mc-compete | compete.md |
| 复盘 / 周报 / campaign 效果怎样 | mc-report | report.md |
| 直播 / 直播间 / 开播 / 直播带货 / 直播脚本 / 选品排品 / GPM / 坑位 / 直播切片 / 淘宝直播 / 天猫直播 | mc-livestream | livestream.md |
| 写文案 / 文案 / copy / 文案风格 / 标题 / slogan / tagline / 详情页文案 / 软文 / 品牌宣言 / manifesto / 电商文案 / 种草文 | mc-copy | copy.md |
| 从头做品牌 / 全链路 / 完整 campaign / 一条龙 / 全部帮我做 / full pipeline / end to end / run all / 全流程 | mc-orchestrate | — |
| 查看品牌记忆 / 品牌积累 / 记住这个洞察 / 更新品牌记忆 / brand memory | mc-memory | brand-memory.md |

**多步骤请求**（如"帮我做一个完整的 campaign"）：依次执行 mc-campaign 的各步骤，每步都走 setup → 执行 → finalize 完整链路。

---

## 品牌上下文注入

在路由到任何技能之前，先检测品牌上下文：

```bash
# 检测 brand.md 是否存在
BRAND_FILE="campaigns/{slug}/brand.md"
if [ -f "$BRAND_FILE" ]; then
  echo "品牌上下文已加载: $BRAND_FILE"
fi
```

**品牌上下文注入规则：**

| 情况 | 处理 |
|------|------|
| `brand.md` 存在 | 读取品牌定位、人格、语调体系，作为上下文注入当前技能执行 |
| `brand.md` 不存在，且调用的是 mc-brand | 正常执行，这是创建 brand.md 的步骤 |
| `brand.md` 不存在，且调用的是其他技能 | 提示用户"建议先运行 mc-brand 建立品牌上下文，可以提升所有后续产出的品牌一致性。是否先做？" |
| `storyteller.md` 存在 | 同时加载叙事体系（核心冲突、角色、母题），供 mc-content / mc-aigc / mc-kol 使用 |
| `memory/brand-memory.md` 存在 | 读取所有章节，作为"品牌长期记忆"注入，优先于当次 campaign 的 brand.md |
| `brief.md` 含 `brand: {slug}` 字段 | 从 `memory/{slug}/brand-memory.md` 读取替代默认路径 |

**v1 冲突处理**：brand-memory.md 与当次 brand.md 内容冲突时，两者共同提供上下文，由执行技能自行综合，不强制去重。

**自动加载的上下文文件（按优先级）：**

0. `brand-memory.md` — 跨 campaign 持久品牌智慧（从 `memory/` 目录加载，见下方规则）
1. `brand.md` — 品牌策略（全局）
2. `storyteller.md` — 叙事体系
3. `brief.md` — Campaign brief
4. `insight.md` — 文化洞察
5. `research.md` — 市场调研
6. `selection.md` — 选品决策
7. `livestream.md` — 直播运营方案
8. `copy.md` — 文案产出

技能可以选择性使用这些上下文，但 dispatch 负责确保它们在执行前被加载。

---

## 执行流程

每次收到营销请求，按以下五步执行：

### 第 0 步：品牌上下文检测

检查 `campaigns/{slug}/` 下是否存在 brand.md、storyteller.md 等上下文文件，自动加载。

### 第 1 步：提取结构化参数

从用户请求中提取：

- `skill`：对应路由表的技能名（mc-xxx）
- `slug`：`{品牌/产品}-{场景}-{市场}` 格式，全小写连字符
  - 示例：`glowlab-dtc-us-launch`、`零糖茶-春季上市`、`saas-lead-scoring`
- `step`：当前步骤 ID（brand / storyteller / insight / brief / research / strategy / content / seo / geo / automation / dtc / channel / analytics / compete / review / report / kol / community / selection / product / aigc）

如果用户没提供品牌名，从 brief 内容推断；实在无法推断，用 `campaign-{YYYYMMDD}` 格式。

### 第 2 步：初始化 Campaign

```bash
node {SKILL_DIR}/../scripts/setup.mjs \
  --slug "{slug}" \
  --skill "{skill}" \
  --step "{step}"
```

`{SKILL_DIR}` 是本技能文件所在目录，`scripts/` 在其上级的 sibling 目录。此命令输出 `campaigns/{slug}`，确认目录已就位，`.status.json` 已初始化，WebUI 可立即看到这个 campaign。

### 第 3 步：执行技能内容

按对应技能（mc-{skill}）的完整流程执行，**将完整 markdown 产出写入临时文件**：

```bash
cat > /tmp/mc-{slug}-{step}.md << 'MC_OUTPUT_EOF'
{完整的 markdown 产出内容，包含所有章节和交付卡}
MC_OUTPUT_EOF
```

**注意**：此步只写文件，不在对话中输出任何内容。

### 第 4 步：后处理（finalize）

```bash
node {SKILL_DIR}/../scripts/finalize.mjs \
  --slug   "{slug}" \
  --step   "{step}" \
  --file   "{output-filename}" \
  --skill  "{skill}" \
  --input  /tmp/mc-{slug}-{step}.md
```

`finalize.mjs` 完成：
- ✅ 将完整内容写入 `campaigns/{slug}/{output-filename}`
- ✅ 更新 `.status.json` → WebUI 实时反映步骤完成
- ✅ 从内容中提取交付卡（`━━━━━` 边界块）
- ✅ 将交付卡输出到 stdout

**将 finalize.mjs 的输出原样返回给用户，不添加任何额外内容。**

---

## 推荐执行顺序

多步全链路请求推荐使用 mc-orchestrate 自动执行。以下是手动逐步调用时的推荐顺序：

```
mc-brand（品牌策略 → brand.md）
  ↓
mc-storyteller（叙事体系 → storyteller.md）
  ↓
mc-insight（文化洞察 → insight.md）
  ↓
mc-research（市场调研 → research.md）
  ↓
mc-selection（选品 → selection.md）→ mc-product（造品 → product.md）
  ↓
mc-campaign（策略 → strategy.md）
  ↓
mc-content（内容 → content/*.md）→ mc-copy（文案 → copy.md）→ mc-aigc（视觉素材 → aigc.md）
  ↓
mc-seo + mc-geo（搜索优化 → seo.md + geo.md）
  ↓
mc-kol（达人策略 → kol.md）→ mc-community（私域 → community.md）
  ↓
mc-livestream（直播运营 → livestream.md）
  ↓
mc-automation（自动化 → automation.md）→ mc-dtc（独立站 → dtc.md）
  ↓
mc-review（合规审查 → review.md）
  ↓
mc-analytics（数据分析 → analytics.md）→ mc-report（复盘 → report.md）
```

不必按此顺序执行——任何技能都可以独立调用。这只是全链路时的最优流转。

---

## 异常处理

| 情形 | 处理方式 |
|------|---------|
| setup.mjs 失败（如权限问题） | 告知用户路径，建议手动创建 `campaigns/{slug}/`，然后继续 |
| finalize.mjs 找不到交付卡边界 | 脚本自动输出 fallback 交付卡，不影响文件写入 |
| 用户指定了已有 slug | 跳过目录创建（setup.mjs 会检测已有目录），直接追加执行 |
| 用户只需要快速问答（不需要文件） | 跳过 setup/finalize，直接回答，结尾标注"未写入文件" |
| brand.md 不存在但用户坚持跳过 | 尊重用户意愿，继续执行，但在交付卡中标注"未加载品牌上下文" |

---

## 快速问答模式

当用户的请求是**快速咨询**（不需要生成文档），例如：
- "ROAS 是什么意思"
- "小红书算法最近有什么变化"
- "我的 campaign slug 该怎么起名"

跳过 setup/finalize 直接回答，结尾加：
> `💡 如需生成正式文档，告诉我品牌名和场景，我来创建 campaign。`

---

## 路径解析说明

脚本路径取决于技能的安装位置。在对话开始时，运行一次路径探测：

```bash
# 探测 scripts/ 目录
SKILL_DIR=$(ls ~/.openclaw/skills/mc-dispatch/SKILL.md 2>/dev/null && echo ~/.openclaw/skills/mc-dispatch || echo ./skills/mc-dispatch)
SCRIPTS_DIR="$(dirname $SKILL_DIR)/../scripts"
ls "$SCRIPTS_DIR/setup.mjs" && echo "scripts found at $SCRIPTS_DIR" || echo "scripts not found"
```

路径说明：
- 全局安装：`~/.openclaw/skills/mc-dispatch/../scripts` → `~/.openclaw/scripts/` ✓
- 本地仓库：`./skills/mc-dispatch/../scripts` → `./scripts/` ✓

若 scripts 目录未找到，提示用户重新运行 `install.sh`（v1.1+ 已自动安装 scripts/）。
