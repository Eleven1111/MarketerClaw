# mc-livestream 直播运营技能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新建 mc-livestream 技能（6 模块全链路直播运营），升级 mc-kol/mc-community/mc-campaign 的直播联动，更新 mc-dispatch 路由和 README。

**Architecture:** 纯 Markdown 技能文件，无代码。mc-livestream/SKILL.md 是核心新文件，其余 4 个文件做增量修改（追加内容，不改现有结构）。

**Tech Stack:** Markdown (SKILL.md files)

**Spec:** `docs/superpowers/specs/2026-03-24-mc-livestream-design.md`

---

## Task 1: 创建 mc-livestream/SKILL.md

**Files:**
- Create: `skills/mc-livestream/SKILL.md`

**依赖：** 无

- [ ] **Step 1: 创建目录**

```bash
mkdir -p skills/mc-livestream
```

- [ ] **Step 2: 写入 SKILL.md 完整内容**

从 spec 文档 Section 2（2.1 ~ 2.11）组装完整 SKILL.md。结构：

```markdown
---
name: mc-livestream
description: 直播运营全链路技能。从人货场定位、选品排品、脚本话术到执行SOP和切片分发，覆盖电商带货/品牌/达人/知识/活动五大场景，支持抖音/淘宝天猫/小红书/视频号/TikTok/Instagram/YouTube等平台。
---

## 触发条件
{spec 2.1 内容}

## 工作方式
{spec 2.2 内容}

## 模块 1：直播定位与人货场
{spec 2.3 内容：场景分型表 + 人(主播类型表+团队配置) + 货(四种角色表+价格带) + 场(维度表+各平台规范)}

## 模块 2：选品排品
{spec 2.4 内容：排品节奏图 + 排品表模板 + 各场景选品标准}

## 模块 3：脚本话术
{spec 2.5 内容：单品讲解结构 + 话术模板库(留人/互动/转化/品牌/知识) + 各平台脚本差异表}

## 模块 4：执行 SOP
{spec 2.6 内容：开播前表 + 开播中表 + 下播后表 + 突发预案表 + 团队分工(此处不重复，引用模块1)}

## 模块 5：数据指标与复盘
{spec 2.7 内容：四层指标体系(流量/留存/转化/品牌) + 复盘模板}

## 模块 6：直播切片与二次分发
{spec 2.8 内容：切片策略 + 切片规格表 + 加工要点 + 各平台分发适配表 + 发布节奏}

## 输出模式
{spec 2.9 内容：快速方案/完整策略/单项执行}

## 与其他技能的联动
{spec 2.10 内容：9个联动技能表}

## 交互规则
- 直播策略可独立使用，也可作为 campaign 的一个环节
- 用户可按需调用单个模块
- 输出完成后告知文件路径，不在对话中重复全文
- 与其他技能串联时，自动读取已有上下文文件

## 交付规范
{spec 2.11 内容：交付卡模板}
```

内容直接从 spec 的 Section 2 各子节复制，不需要额外创作。注意：
- 模块 4 的团队分工部分在 spec 中同时出现在 2.3（人货场→团队配置）和 2.6（执行 SOP），SKILL.md 中在模块 1 放完整版，模块 4 写"团队分工见模块 1"避免重复。
- 各平台直播间规范在 2.3（场→各平台规范）中，不在模块 4 重复。

- [ ] **Step 3: 验证文件结构**

```bash
# 验证 frontmatter 格式正确
head -5 skills/mc-livestream/SKILL.md
# 验证包含所有 6 个模块标题
grep "## 模块" skills/mc-livestream/SKILL.md
# 预期输出 6 行：模块 1 ~ 模块 6
```

- [ ] **Step 4: Commit**

```bash
git add skills/mc-livestream/SKILL.md
git commit -m "feat(mc-livestream): add livestream operations skill with 6 modules"
```

---

## Task 2: 升级 mc-kol — 新增达人直播合作专项

**Files:**
- Modify: `skills/mc-kol/SKILL.md:248-282` (在模块 4「达人 Brief 撰写」结尾和模块 5 之间插入新子模块)
- Modify: `skills/mc-kol/SKILL.md:306-326` (在模块 6 效果评估的"转化层"表格后追加直播指标)

**依赖：** 无（与 Task 1 可并行）

- [ ] **Step 1: 在模块 4 和模块 5 之间插入"达人直播合作专项"**

在 `skills/mc-kol/SKILL.md` 第 248 行（Brief 模板结束的 ``` 之后）和第 250 行（`---` 分隔线，模块 5 开始之前）之间，插入以下内容：

```markdown

### 达人直播合作专项

当达人合作形式包含"直播"时，额外输出以下内容。

#### 坑位规划表

```markdown
## 达人直播坑位规划

| 坑位序号 | 时段 | 商品名 | 时长 | 机制(赠品/折扣/限量) | 预估GMV | 坑位费 | 佣金比例 | 预估ROI |
|---------|------|--------|------|---------------------|---------|--------|---------|---------|
```

#### 达人直播 Brief 补充字段

在标准 Brief 基础上，直播合作必须额外包含：

```markdown
### 直播专项要求
- 直播时长要求：
- 坑位时段：
- 直播间场景要求：{是否需要品牌背景/产品陈列/特定布景}
- 话术必须包含：{核心卖点/促销机制}
- 话术红线：{不可说的功效宣称/竞品提及/夸张表述}
- 产品展示要求：{上脸/试用/对比/拆箱}
- 实时数据对接：{是否需要实时共享后台数据}
- 直播切片授权：{品牌是否可使用直播切片做二次投放}
```
```

- [ ] **Step 2: 在模块 6 效果评估的转化层后追加直播指标**

在 `skills/mc-kol/SKILL.md` 第 326 行（达人 ROI 排名表 ``` 结束之后），追加：

```markdown

### 达人直播专项指标

当合作形式为直播时，效果评估额外包含：

| 指标 | 数值 | 判断 |
|------|------|------|
| 坑位 ROI（GMV / 坑位费+佣金）| | |
| 坑位时段 GPM | | |
| 坑位时段平均在线 | | |
| 退货率 | | |
| 新客占比 | | |
| 直播切片二次传播数据 | | |
```

- [ ] **Step 3: 验证修改**

```bash
# 验证新增内容存在
grep "达人直播合作专项" skills/mc-kol/SKILL.md
grep "达人直播专项指标" skills/mc-kol/SKILL.md
# 验证模块顺序未被打乱
grep "## 模块" skills/mc-kol/SKILL.md
# 预期：模块 1 ~ 模块 6，顺序不变
```

- [ ] **Step 4: Commit**

```bash
git add skills/mc-kol/SKILL.md
git commit -m "feat(mc-kol): add KOL livestream collaboration module"
```

---

## Task 3: 升级 mc-community — 扩展直播→私域链路

**Files:**
- Modify: `skills/mc-community/SKILL.md:311-315` (将"抖音直播"单行扩展为多平台直播→私域子模块)

**依赖：** 无（与 Task 1/2 可并行）

- [ ] **Step 1: 替换引流路径表中的直播行并追加子模块**

在 `skills/mc-community/SKILL.md` 的模块 6 引流路径表（第 304-315 行的 code block）中，将：

```
| 抖音直播 | 直播间口播+弹窗 | 加微领福利 | 5-15% |
```

替换为：

```
| 抖音直播 | 直播间口播+弹窗+粉丝团 | 加微领直播专属福利 | 5-15% |
| 淘宝/天猫直播 | 直播间粉丝群+客服卡片+包裹卡 | 加群领专属券/赠品 | 8-20% |
| 小红书直播 | 口播+评论区引导 | 入群领试用装/资料 | 3-10% |
| 视频号直播 | 直播间组件+公众号 | 一键关注+入群 | 10-25% |
| TikTok Live | Bio link + 口播 | Join for exclusive deals | 3-8% |
| Instagram Live | Bio link + Stories | DM for discount code | 2-8% |
| YouTube Live | 描述栏+置顶评论 | Join community for bonus | 2-5% |
```

- [ ] **Step 2: 在引流路径表 code block 结束后、裂变机制之前，插入直播→私域 SOP 子模块**

在第 315 行（引流路径 code block 的 ``` 结束）和第 317 行（`### 裂变机制`）之间插入：

```markdown

### 直播 → 私域完整链路

#### 直播间粉丝团 → 私域转化 SOP

| 步骤 | 动作 | 时机 |
|------|------|------|
| 1 | 粉丝团专属福利引导加企微 | 直播中（整点或特定时段）|
| 2 | 企微自动欢迎语 + 拉群 | 用户添加后即时 |
| 3 | 群内发送直播回顾+专属价 | 下播后 1h 内 |
| 4 | 48h 内 1v1 跟进未转化用户 | D+1-2 |

#### 直播后私域承接话术

- **欢迎语：** "Hi～感谢在直播间关注我们！我是你的专属顾问 XX，这是你的直播间专属福利：{福利内容}"
- **48h跟进：** "昨天直播间那个 XX 你感兴趣吗？还有最后 XX 件直播价库存，要不要帮你留一件？"
- **长期培育：** "下周 X 我们还有一场 XX 主题直播，到时候有更大力度的福利，我提前通知你～"

> 完整的直播运营方案（人货场/脚本/选品/SOP）请使用 mc-livestream 技能。
```

- [ ] **Step 3: 验证修改**

```bash
# 验证多平台直播引流都已添加
grep "直播" skills/mc-community/SKILL.md | head -15
# 验证新增 SOP 子模块
grep "直播 → 私域完整链路" skills/mc-community/SKILL.md
grep "直播后私域承接话术" skills/mc-community/SKILL.md
```

- [ ] **Step 4: Commit**

```bash
git add skills/mc-community/SKILL.md
git commit -m "feat(mc-community): expand livestream-to-private-domain funnel"
```

---

## Task 4: 升级 mc-campaign — 直播策略联动 + 渠道排布

**Files:**
- Modify: `skills/mc-campaign/SKILL.md:123-128` (策略规划部分，竞品分类规则后追加直播联动)
- Modify: `skills/mc-campaign/SKILL.md:189-194` (渠道排布部分，产出 channel.md 前追加直播排布模板)

**依赖：** 无（与 Task 1/2/3 可并行）

- [ ] **Step 1: 在第二步策略规划的竞品分类规则后追加直播联动**

在 `skills/mc-campaign/SKILL.md` 第 123 行（`- 其他 → 内容铺量`）之后、第 125 行（`### 产出：strategy.md`）之前，插入：

```markdown

### 直播策略联动

当 brief 中包含以下任一信号时，自动建议调用 mc-livestream（追加触发词，不替换现有"直播转化"分类逻辑）：
- 现有关键词（保留）：直播/连播/直播间
- 新增关键词：带货/GPM/坑位/直播切片/直播脚本/淘宝直播/天猫直播
- 转化策略选择了"直播转化"
- 平台包含抖音/淘宝天猫/小红书/视频号/TikTok 且目标含 GMV/转化

建议话术："检测到直播相关需求，建议使用 mc-livestream 技能生成完整直播运营方案，包括人货场规划、脚本话术和执行 SOP。是否现在生成？"
```

- [ ] **Step 2: 在第四步渠道排布的"必须包含"列表后追加直播渠道排布模板**

在 `skills/mc-campaign/SKILL.md` 第 189 行（`6. **监测节奏** — KPI checkpoint 设置`）之后、第 191 行（`### 产出：channel.md`）之前，插入：

```markdown

### 直播渠道排布（当 campaign 含直播时）

| 阶段 | 时间 | 直播动作 | 配合动作 |
|------|------|---------|---------|
| 预热期 | D-7 到 D-1 | — | 短视频预热+社群预告+朋友圈倒计时 |
| 引爆期 | D-Day | 大场直播 / 达人直播 | 付费投流+社群导流+切片即时分发 |
| 收口期 | D+1 到 D+7 | 返场直播（可选）| 切片二次分发+私域跟进+数据复盘 |

日播节奏（如适用）：

| 频率 | 内容 | 目的 |
|------|------|------|
| 每日 | 常规日播（2-4h）| 稳定 GMV + 算法权重积累 |
| 每周 | 1 场主题直播 | 新品/爆品/节日专场 |
| 每月 | 1 场大场直播 | 冲 GMV + 品牌事件 |
```

- [ ] **Step 3: 验证修改**

```bash
grep "直播策略联动" skills/mc-campaign/SKILL.md
grep "直播渠道排布" skills/mc-campaign/SKILL.md
# 验证原有结构未被破坏
grep "^## " skills/mc-campaign/SKILL.md
# 预期：第一步 ~ 第六步的标题顺序不变
```

- [ ] **Step 4: Commit**

```bash
git add skills/mc-campaign/SKILL.md
git commit -m "feat(mc-campaign): add livestream strategy linkage and channel template"
```

---

## Task 5: 更新 mc-dispatch 路由表

**Files:**
- Modify: `skills/mc-dispatch/SKILL.md:39` (路由表末尾追加 mc-livestream 行)
- Modify: `skills/mc-dispatch/SKILL.md:156-162` (推荐执行顺序追加 mc-livestream)

**依赖：** Task 1（mc-livestream 文件必须已存在）

- [ ] **Step 1: 在路由表追加 mc-livestream**

在 `skills/mc-dispatch/SKILL.md` 第 39 行（`| 复盘 / 周报 / campaign 效果怎样 | mc-report | report.md |`）之后，追加：

```markdown
| 直播 / 直播间 / 开播 / 直播带货 / 直播脚本 / 选品排品 / GPM / 坑位 / 直播切片 / 淘宝直播 / 天猫直播 | mc-livestream | livestream.md |
```

- [ ] **Step 2: 在推荐执行顺序中插入 mc-livestream**

在 `skills/mc-dispatch/SKILL.md` 第 162 行（`mc-kol（达人策略 → kol.md）→ mc-community（私域 → community.md）`）之后，插入：

```markdown
  ↓
mc-livestream（直播运营 → livestream.md）
```

- [ ] **Step 3: 在自动加载的上下文文件列表追加**

在 `skills/mc-dispatch/SKILL.md` 第 73 行（`5. `research.md` — 市场调研`）之后，追加：

```markdown
6. `selection.md` — 选品决策
7. `livestream.md` — 直播运营方案
```

- [ ] **Step 4: 验证修改**

```bash
grep "mc-livestream" skills/mc-dispatch/SKILL.md
# 预期：至少 3 处匹配（路由表 + 执行顺序 + 上下文文件）
```

- [ ] **Step 5: Commit**

```bash
git add skills/mc-dispatch/SKILL.md
git commit -m "feat(mc-dispatch): add mc-livestream to routing table and execution order"
```

---

## Task 6: 更新 README.md

**Files:**
- Modify: `README.md:52` (技能一览表中 mc-community 行之后插入 mc-livestream)

**依赖：** Task 1

- [ ] **Step 1: 在技能一览表插入 mc-livestream**

在 `README.md` 第 52 行（mc-community 行）之后，插入：

```markdown
| `mc-livestream` | Livestream | 直播运营（人货场/选品排品/脚本话术/执行SOP/数据复盘/切片分发，覆盖抖音/淘宝天猫/小红书/视频号/TikTok/IG/YT） | ✅ |
```

- [ ] **Step 2: 验证**

```bash
grep "mc-livestream" README.md
# 预期：1 行匹配
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add mc-livestream to skill list in README"
```

---

## 执行顺序

Task 1-4 可并行（互不依赖）。Task 5 和 6 依赖 Task 1 完成后执行。

```
Task 1 (mc-livestream) ──┬──→ Task 5 (mc-dispatch) ──→ Task 6 (README)
Task 2 (mc-kol)      ───┘
Task 3 (mc-community) ──┘
Task 4 (mc-campaign)  ──┘
```
