---
name: mc-orchestrate
description: 全链路自主执行技能。用户说"从头做品牌"或"完整 campaign"时触发，自动按依赖顺序串联多个技能执行，智能暂停等待决策，完成后输出汇总交付卡。支持 A/B/C 三档深度，B/C 档附带时间和 token 成本提示。
---

# mc-orchestrate · 全链路自主执行

## 触发条件

当用户提到以下任意情形时使用本技能：

- "从头做一个品牌" / "帮我做完整品牌策略" / "从零建品牌"
- "跑完整 campaign" / "全链路作战" / "全链路执行" / "一条龙"
- "全部帮我做" / "从零开始" / "完整执行" / "全套方案"
- "run all" / "full pipeline" / "end to end" / "全流程"

**不触发（单步请求走 mc-dispatch）：**
- "帮我写文案" → mc-copy
- "做一个品牌策略" → mc-brand
- "分析竞品" → mc-compete

---

## 与 mc-dispatch 的关系

```
用户请求
    │
    ├─ 单步请求 ──────────────────→ mc-dispatch → 对应技能
    │
    └─ 多步请求（全链路触发词）──→ mc-orchestrate
                                        │
                                        └─ 按依赖顺序调用各技能
```

mc-dispatch 路由表有一行指向 mc-orchestrate，其余路由逻辑完全不变。

---

## 三档执行深度

触发后展示选项，等待用户选择：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 MarketerClaw 全链路执行模式
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

请选择执行深度：

A · 品牌基础层（推荐·默认）
    Batch 1: mc-brand + mc-compete（条件）
    Batch 2: mc-storyteller + mc-insight + mc-research
    5 个步骤 · 2 个批次 · 约 15-20 分钟 · 中等 token 消耗

B · 扩展到内容层
    A 基础 + mc-selection（条件）→ mc-campaign → mc-content + mc-kol → mc-copy
    约 10 个步骤 · 6 个批次 · 约 40-60 分钟
    ⚠️ token 消耗较高，建议在品牌策略确认后再执行

C · 完整 20 步全链路
    覆盖所有技能直到 mc-analytics / mc-report
    约 20 个步骤 · 11 个批次 · 约 2-3 小时
    ⚠️ token 消耗极高。建议先跑 A 确认品牌方向，再分次执行 B/C

直接回复 A / B / C，或说"继续"默认选 A
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

步骤数为估算值；条件步骤（mc-compete / mc-selection / mc-livestream / mc-dtc）是否执行在 Phase 0 信息收集后确定。

用户回复后立即进入信息收集，不再重复展示选项。

---

## 执行流程

### Phase 0：信息收集

启动前确认以下字段：

| 字段 | 缺失处理 |
|------|---------|
| 产品 / 服务名称 | 必须追问 |
| 目标人群 | 必须追问 |
| 主平台（小红书/抖音/TikTok 等） | 必须追问 |
| 目标市场（国内/海外/双线） | 必须追问 |
| 项目类型 | 必须追问（选项：实物产品类 / 服务类 / 直播带货类 / 海外出海类，可多选） |
| 竞品品牌（选填，逗号分隔） | 留空则跳过 mc-compete |
| 预算范围 | 做假设并标注 ⚠️ |
| 活动窗口 | 做假设并标注 ⚠️ |

**项目类型字段的作用：**
- `实物产品类` → B 档自动包含 mc-selection（Step 6）
- `直播带货类` → C 档自动包含 mc-livestream（Step 15）
- `海外出海类` → C 档自动包含 mc-dtc（Step 17）
- 其他类型跳过对应步骤，进度编号顺移，不影响后续依赖

已有 `brief.md` 时直接读取，不重复追问。

信息收集完成后调用 `setup.mjs` 初始化 campaign 目录和 `.status.json`。

---

### Phase 1：按依赖拓扑执行

#### 档位 A — 品牌基础层（默认）

| Step | 技能 | 输出文件 | depends_on | 条件 |
|------|------|---------|-----------|------|
| 1 | mc-brand | brand.md | — | — |
| 2 | mc-compete | compete.md | — | 有竞品品牌 |
| 3 | mc-storyteller | storyteller.md | Step 1 | — |
| 4 | mc-insight | insight.md | Step 1 | — |
| 5 | mc-research | research.md | Step 1 | — |

批次分组：
- **Batch 1**：Step 1 + Step 2（条件）
- **Batch 2**：Step 3 + Step 4 + Step 5

#### 档位 B — 扩展到内容层

在 A 基础上继续：

| Step | 技能 | 输出文件 | depends_on | 条件 |
|------|------|---------|-----------|------|
| 6 | mc-selection | selection.md | Step 5 | 实物产品类 |
| 7 | mc-campaign | strategy.md | Step 1-5（+Step 6 若执行） | — |
| 8 | mc-content | content/{平台}.md | Step 7 | — |
| 9 | mc-kol | kol.md | Step 7 | — |
| 10 | mc-copy | copy.md | Step 8 | — |

批次分组：
- **Batch 3**：Step 6（条件）
- **Batch 4**：Step 7
- **Batch 5**：Step 8 + Step 9
- **Batch 6**：Step 10

#### 档位 C — 完整链路

在 B 基础上继续：

| Step | 技能 | 输出文件 | depends_on | 条件 |
|------|------|---------|-----------|------|
| 11 | mc-seo | seo.md | Step 7 | — |
| 12 | mc-geo | geo.md | Step 7 | — |
| 13 | mc-community | community.md | Step 7 | — |
| 14 | mc-automation | automation.md | Step 7 | — |
| 15 | mc-livestream | livestream.md | Step 10 | 直播带货类 |
| 16 | mc-aigc | aigc.md | Step 10 | — |
| 17 | mc-dtc | dtc.md | Step 10 | 海外出海类 |
| 18 | mc-review | review.md | Step 11-17 | — |
| 19 | mc-analytics | analytics.md | Step 18 | — |
| 20 | mc-report | report.md | Step 19 | — |

批次分组：
- **Batch 7**：Step 11 + Step 12 + Step 13 + Step 14
- **Batch 8**：Step 15（条件）+ Step 16 + Step 17（条件）
- **Batch 9**：Step 18
- **Batch 10**：Step 19
- **Batch 11**：Step 20

条件步骤跳过时：该步骤视为已完成，不影响后续批次启动。

---

### 批次执行规则

- 同一批次内所有步骤连续执行，无需等待用户输入
- 下一批次在当前批次全部完成后启动
- 批次内某步骤失败：暂停整个批次，报告失败步骤，等待用户决策（重试 / 跳过）
- 条件步骤（mc-compete / mc-selection / mc-livestream / mc-dtc）被跳过时：视为该批次已完成，后续依赖该步骤的批次不受影响
- 智能暂停（Phase 2）在批次间检查，不在批次内中断

---

### Phase 2：智能暂停逻辑

以下情况自动暂停，展示当前产出摘要并等待用户决策：

| 触发条件 | 暂停内容 |
|---------|---------|
| mc-brand 产出 2+ 个差异化品牌定位方向 | 展示各方向对比，请用户选择 |
| mc-insight 发现明显踩雷风险 | 展示风险说明，确认是否继续 |
| 执行到需要预算分配的步骤（mc-campaign） | 确认各渠道预算分配比例 |
| 执行到平台内容生产（mc-content）前 | 确认目标平台列表和优先级 |
| 已存在 brand.md | 询问：升级现有品牌策略 or 全新创建 |

**不暂停：** 纯执行类步骤（storyteller、research、insight、seo、geo、copy 等）自动运行，完成后在后台更新状态，对话中只显示进度行。

---

### Phase 3：进度展示

执行过程中对话里只显示简洁进度，不输出完整文档：

```
⏳ Batch 1/2 · mc-brand + mc-compete 执行中...
✅ Batch 1/2 完成 → brand.md + compete.md

⏳ Batch 2/2 · 并行执行 mc-storyteller + mc-insight + mc-research...
✅ Batch 2/2 完成 → storyteller.md + insight.md + research.md
```

分母为本次档位的实际批次数（条件步骤跳过后批次合并时重新计算）。

每步完成后通过 `finalize.mjs` 写入文件并更新 `.status.json`（WebUI 实时可见）。

---

### Phase 4：汇总交付卡

全部步骤完成后输出（以档位 A 为例，实际列出本次执行的所有文件）：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ mc-orchestrate · 全链路执行完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 campaigns/{slug}/

✓ brand.md          品牌策略
✓ storyteller.md    叙事体系
✓ insight.md        文化洞察
✓ research.md       市场调研

⏱ 执行时长：{N} 分钟
📌 {N} 个智能暂停点，{M} 个假设字段（已标注 ⚠️）

➡️  下一步：
   · 查看 brand.md 确认品牌方向
   · 运行 mc-campaign 启动作战规划
   · 或直接说"继续执行 B 档"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 异常处理

| 情形 | 处理方式 |
|------|---------|
| 某步骤执行失败 | 标注失败步骤，询问用户是重试还是跳过，已完成步骤不重跑 |
| 用户中途说"停" | 立即停止，输出当前进度卡，已完成文件保留 |
| 用户中途说"跳过这步" | 跳过当前步骤，继续执行后续依赖不受影响的步骤 |
| 上下文超长 | 提示用户当前 context 较满，建议新会话继续，提供 slug（断点续跑为 v2 功能，v1 需用户手动在新会话中说"继续 slug={slug} 的执行，从 Step N 开始"） |
