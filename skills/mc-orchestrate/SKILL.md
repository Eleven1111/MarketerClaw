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
    mc-brand → mc-storyteller → mc-insight → mc-research
    4 个步骤 · 约 15-20 分钟 · 中等 token 消耗

B · 扩展到内容层
    品牌基础 + mc-campaign → mc-content（各平台）→ mc-copy → mc-kol
    约 8 个步骤 · 约 40-60 分钟
    ⚠️ token 消耗较高，建议在品牌策略确认后再执行

C · 完整 22 技能全链路
    覆盖所有技能直到 mc-analytics / mc-report
    约 22 个步骤 · 约 2-3 小时
    ⚠️ token 消耗极高。建议先跑 A 确认品牌方向，再分次执行 B/C

直接回复 A / B / C，或说"继续"默认选 A
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

步骤数为估算值；条件步骤（mc-selection / mc-livestream / mc-dtc）是否执行在 Phase 0 信息收集后确定。

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
| 预算范围 | 做假设并标注 ⚠️ |
| 活动窗口 | 做假设并标注 ⚠️ |

**项目类型字段的作用：**
- `实物产品类` → B 档自动包含 mc-selection（Step 5）
- `直播带货类` → C 档自动包含 mc-livestream（Step 13）
- `海外出海类` → C 档自动包含 mc-dtc（Step 16）
- 其他类型跳过对应步骤，进度编号顺移，不影响后续依赖

已有 `brief.md` 时直接读取，不重复追问。

信息收集完成后调用 `setup.mjs` 初始化 campaign 目录和 `.status.json`。

---

### Phase 1：按深度执行

#### 档位 A — 品牌基础层（默认）

```
Step 1: mc-brand       → campaigns/{slug}/brand.md
Step 2: mc-storyteller → campaigns/{slug}/storyteller.md
Step 3: mc-insight     → campaigns/{slug}/insight.md
Step 4: mc-research    → campaigns/{slug}/research.md
```

依赖关系：
- Step 2 依赖 Step 1（需读取 brand.md）
- Step 3、Step 4 可在 Step 1 完成后并行执行

#### 档位 B — 扩展到内容层

在 A 基础上继续：

```
Step 5: mc-selection  → campaigns/{slug}/selection.md     （实物产品类项目）
Step 6: mc-campaign   → campaigns/{slug}/strategy.md
Step 7: mc-content    → campaigns/{slug}/content/{平台}.md  （按用户指定平台）
Step 8: mc-copy       → campaigns/{slug}/copy.md
Step 9: mc-kol        → campaigns/{slug}/kol.md
```

Step 5 仅当项目类型包含「实物产品类」时执行。跳过时不影响后续依赖，Step 6 在所有 A 档步骤完成后执行。

#### 档位 C — 完整链路

在 B 基础上继续：

```
Step 10: mc-seo        → campaigns/{slug}/seo.md
Step 11: mc-geo        → campaigns/{slug}/geo.md
Step 12: mc-community  → campaigns/{slug}/community.md
Step 13: mc-livestream → campaigns/{slug}/livestream.md   （直播带货类项目）
Step 14: mc-aigc       → campaigns/{slug}/aigc.md
Step 15: mc-automation → campaigns/{slug}/automation.md
Step 16: mc-dtc        → campaigns/{slug}/dtc.md           （海外出海类项目）
Step 17: mc-review     → campaigns/{slug}/review.md
Step 18: mc-analytics  → campaigns/{slug}/analytics.md
Step 19: mc-report     → campaigns/{slug}/report.md
```

Step 13（mc-livestream）仅当项目类型包含「直播带货类」时执行。
Step 16（mc-dtc）仅当项目类型包含「海外出海类」时执行。
其余步骤均自动执行，跳过的步骤不影响后续依赖。

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
⏳ Step 1/4 · mc-brand 执行中...
✅ Step 1/4 · mc-brand 完成 → brand.md
⏳ Step 2/4 · mc-storyteller 执行中...
✅ Step 2/4 · mc-storyteller 完成 → storyteller.md
...
```

分母为本次执行的实际步骤数（条件步骤被跳过时不计入总数）。

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
