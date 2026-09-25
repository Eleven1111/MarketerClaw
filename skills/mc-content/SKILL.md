---
name: mc-content
description: 单平台内容生产技能。给定 campaign brief 和目标平台（国内或海外），输出可直接使用的内容矩阵、选题、标题、脚本和 CTA，写入 campaign 目录。
---

## 触发条件

当用户提到以下任意情形时使用本技能：

- "给我出小红书内容" / "抖音脚本" / "微信长文" / "B站选题"
- "Instagram post" / "TikTok script" / "YouTube outline" / "Amazon listing"
- "这个 campaign 的内容矩阵"
- "帮我写一版 {平台} 的内容"
- 明确指定了平台 + 内容需求

---

## 工作方式

1. 检查 `campaigns/` 目录下是否有对应 campaign 的 `brief.md`
2. 如果有，读取 brief 和 strategy（如有）作为上下文
3. 如果没有，要求用户提供：产品、人群、平台、品牌调性（最少这 4 项）
4. 产出写入 `campaigns/{project-slug}/content/{平台名}.md`

### 语言规则

- 国内平台：中文输出
- 海外平台：默认英文输出，用户可指定语言（如"用日语写 Instagram 内容"）
- 跨境品牌（同时涉及国内 + 海外）：每个平台文件用对应市场的主要语言

---

## 输出规范

### 每个平台文件必须包含

```markdown
# {平台名} · 内容作战卡

**项目：** {项目名}
**目标人群：** {人群}
**品牌调性：** {调性}
**日期：** {当前日期}
**语言/市场：** {语言和目标市场}

---

## 选题矩阵

### 角度 1：{角度名}
- **标题：** {可直接使用的标题，不是"参考方向"}
- **形态：** {图文/短视频/长文...}
- **开头：** {第一句话或前 3 秒脚本}
- **核心论据：** {用什么证明卖点}
- **CTA：** {具体转化动作}

### 角度 2：...

### 角度 3：...

---

## 调性指引
{这个平台上品牌调性的具体表达要求}

## 禁区
{这个平台上不能出现的表达、格式或动作}

## 关键词 / Hashtag 建议
{搜索关键词 / 话题标签 / 热搜词}
```

---

## 国内平台规则

### 小红书

- 标题必须有钩子感，适合搜索场景（"我试了30天XX后…"、"被问了100遍的XX"）
- 封面建议（文字排版方向、画面构图提示）
- 正文结构：钩子 → 痛点共鸣 → 产品植入 → 使用体验 → CTA
- 关键词密度：标题含 1 个核心词，正文自然分布 3-5 次
- 严禁直接放联系方式、微信号

### 抖音

- 前 3 秒决定完播率：必须给出具体的开场钩子脚本
- 脚本结构：钩子（0-3s）→ 痛点/好奇（3-8s）→ 产品展示（8-20s）→ 证据/体验（20-40s）→ CTA（最后 5s）
- 口播优先于画面描述
- 给出音乐/节奏建议（轻快/治愈/紧凑）
- 标注"可投 DOU+ 的判断条件"（完播率 > X%、互动率 > X%）

### 微信生态

- 公众号长文结构：标题 → 引入（为什么关注这个话题）→ 正文（3-5 个小节）→ 总结 → CTA（关注/加群/留资）
- 社群转发话术（一句话 + 链接，不超过 30 字）
- 朋友圈文案（3 行以内 + 表情使用指引）
- 私域承接：加企微后的第一条自动回复话术

### 微博

- 话题绑定：推荐 2-3 个话题标签
- 正文控制在 140 字以内（长微博另写）
- 热点挂钩建议（如有时效性节点）
- 互动设计：投票/抽奖/评论区引导

### B站

- 测评/种草视频大纲（而非完整脚本）
- 标题需要信息量（"花了XX天测试了XX款…"）
- 评论区互动设计（置顶评论、粉丝问答引导）
- 视频分 P / 章节建议

### 私域

- 社群欢迎语模板
- 3 天留资培育序列（D1 欢迎 → D2 干货 → D3 转化）
- 企微朋友圈内容（每周 3-5 条节奏）
- 裂变钩子设计（分享有礼、拼团、限时体验）

---

## 海外平台规则

### Instagram

- **Feed Post**：视觉优先，首图决定停留。给出画面构图方向 + 滤镜/色调建议
- **Caption 结构**：钩子句（前 125 字符可见区）→ 价值段 → CTA → Hashtag 块
- **Hashtag 策略**：3-5 个品类词 + 3-5 个长尾词 + 1-2 个品牌词，总数不超 15 个
- **Reels**：前 1.5 秒必须有视觉钩子（动作/文字/转场），7-15 秒为高完播区间
- **Stories**：互动优先（投票/问答/滑动条），单条 Story 只传递一个信息点
- **Carousel**：首图为钩子，中间页为价值/证据，末页为 CTA。每页文字不超过 30 词
- 严禁在 caption 中放可点击链接（链接只能放 bio 或 Stories link sticker）

### TikTok

- **前 1-2 秒**：必须有视觉或语言钩子（"Stop scrolling if..."、反常画面、文字弹出）
- **脚本结构**：Hook（0-2s）→ Context（2-5s）→ Value/Demo（5-30s）→ CTA（最后 3s）
- **最佳时长**：15-30 秒（算法优先推荐高完播率内容）
- **Sound/Music**：标注是否使用 trending sound，或用 original audio
- **文字叠层**：关键信息必须有字幕/文字叠层，因为大量用户静音浏览
- **Hashtag**：3-5 个，包含 1 个 niche tag + 1-2 个 trending tag + 品牌 tag
- **评论区运营**：给出 pinned comment 内容和预埋互动问题
- Spark Ads 投放条件标注（完播率 > X%、分享率 > X%）

### YouTube

- **标题**：信息量优先（"I Tested X for 30 Days — Here's What Happened"），控制在 60 字符内
- **缩略图方向**：面部表情 + 对比/结果暗示 + 高对比色块 + 大字标题（不超 5 词）
- **Shorts（竖版短视频）**：前 2 秒钩子 + 单一信息点 + CTA，15-45 秒最优
- **长视频大纲**：
  - 开头 30 秒：钩子 + 承诺（"By the end of this video you'll know..."）
  - 中间：按章节组织（每 2-3 分钟一个段落），标注 chapter timestamp
  - 结尾：总结 + CTA（subscribe/comment/link in description）
- **Description SEO**：前 2 行含核心关键词，附 timestamp、相关链接和 CTA
- **Tags**：5-10 个搜索关键词，从宽到窄排列

### Facebook / Meta

- **Feed Post**：文字部分前 3 行可见（约 80 字符），钩子必须在折叠线之上
- **Link Post**：标题 + 描述 + 预览图，标题控制在 40 字符内
- **Video**：方形或 4:5 竖版，前 3 秒无需声音也能传达核心信息（自动播放静音）
- **Carousel Ads**：每张卡片一个卖点，最后一张为 CTA 卡
- **Groups / Community**：内容偏讨论引导，不能纯广告
- **Audience targeting 提示**：给出推荐的兴趣标签和 Lookalike 人群方向

### X (Twitter)

- **推文**：280 字符限制内完成钩子 + 价值 + CTA，优先使用短句和换行
- **Thread**：首推为钩子（"Here's what most people get wrong about..."），每条推文一个独立论点，末条为 CTA + 总结
- **引用转推策略**：给出可蹭的行业话题和回复角度
- **Media**：单图/视频显著提高 engagement，给出配图方向
- **Hashtag**：最多 2 个，过多会降低 reach
- **发布时间建议**：根据目标市场时区给出最优发布窗口

### Pinterest

- **Pin 设计**：2:3 竖版比例（1000x1500px），视觉清晰、信息量高
- **标题**：含搜索关键词，不超 100 字符
- **Description SEO**：自然语言描述 + 关键词，不堆砌
- **Board 规划**：建议 board 命名和组织方式（按场景/品类/受众）
- **Idea Pin（多页）**：每页一个步骤或角度，适合教程和 how-to 内容
- **Rich Pin**：标注是否适用 Product Pin / Article Pin / Recipe Pin

### LinkedIn

- **Post 结构**：钩子首行 + 空行 + 3-5 个短段落 + CTA，总长 1200-1500 字符最优
- **钩子句式**：观点挑战型（"Most companies get X wrong"）或个人经历型（"Last week I..."）
- **Carousel (PDF)**：每页一个核心观点，视觉统一，最后一页放 CTA 和作者信息
- **Article（长文）**：适合深度行业洞察，标题含关键词，首段概括全文价值
- **视频**：原生上传，方形或竖版，添加字幕，1-3 分钟最优
- **Hashtag**：3-5 个行业标签，避免过于宽泛（#marketing → #B2BSaaSMarketing）
- **语气**：专业但不学术，个人化但不随意，避免"我司荣获"式官方腔

### Amazon

- **产品标题**：品牌名 + 核心关键词 + 规格 + 卖点，控制在 200 字符内
- **Bullet Points（五点描述）**：每点以卖点大写开头，紧跟具体证据和使用场景
- **A+ Content**：
  - Brand Story 模块：品牌理念 + 差异化 + 信任证据
  - 对比表（vs 竞品或自家产品线）
  - 场景图 + 使用步骤
- **Search Terms（后台关键词）**：不重复标题已有词，填入长尾搜索词和拼写变体
- **Review 引导**：售后邮件序列话术（请求评价，不诱导好评）
- 严禁在 listing 中使用 "best seller" / "#1" 等无法验证的声明

### Google Ads (Search/Display)

- **RSA（响应式搜索广告）**：
  - 15 条标题（每条 ≤30 字符）：覆盖品牌词、品类词、卖点词、CTA 词
  - 4 条描述（每条 ≤90 字符）：价值主张 + 证据 + CTA
  - 钉住规则：建议哪些标题固定在位置 1/2
- **Display 广告文案**：短标题（≤25 字符）+ 长标题（≤90 字符）+ 描述（≤90 字符）
- **Landing Page 对齐**：标注广告文案与落地页的 message match 要点

### Email / Newsletter

- **Subject Line**：≤50 字符，给出 3 个 A/B 测试变体（好奇型/利益型/紧迫型）
- **Preview Text**：补充 subject line 未传递的信息（≤90 字符）
- **正文结构**：问题共鸣 → 方案介绍 → 证据/案例 → CTA 按钮文案
- **CTA 按钮**：动作词开头（"Get" / "Try" / "Claim"），不超 5 词
- **序列设计**：Welcome（D0）→ Value（D2）→ Social Proof（D5）→ Offer（D7）

---

## 交互规则

- 用户可以指定单个平台（"只做小红书"）或多个平台（"Instagram + TikTok + 小红书"）
- 用户可以混合国内外平台（"小红书 + Instagram 都要"），系统按各自规则分别输出
- 用户可以要求追加角度（"再给我 2 个选题"），追加到现有文件末尾
- 用户可以要求调整调性（"再口语化一点"），重写对应文件
- 每个平台文件独立，修改一个不影响其他
- 输出完成后告诉用户文件路径，不要在对话中重复全文

---

<!-- mc-disciplines:start — generated by scripts/sync-disciplines.mjs from templates/disciplines/; edit those, not this block -->

## 通用纪律

### 产出流程

由 mc-cmo 路由或 mc-orchestrate 编排时，slug 和执行流程以调用方为准，跳过本节。用户用 `/mc-content` 直接调用时，按以下步骤落盘，让文件、`.status.json` 与 WebUI 保持一致：

1. 定位脚本（对话中探测一次）：
   ```bash
   for base in "${MC_HOME:-}" ~/.openclaw ~/.claude ~/.hermes .; do
     [ -n "$base" ] && [ -f "$base/scripts/setup.mjs" ] && SCRIPTS_DIR="$base/scripts" && break
   done
   echo "${SCRIPTS_DIR:-scripts not found}"
   ```
2. 确定 slug：`{品牌/产品}-{场景}-{市场}`，全小写连字符；无法推断时用 `campaign-{YYYYMMDD}`。已有同名 campaign 时沿用。
3. 加载上下文：`campaigns/{slug}/` 下已有 brand.md、storyteller.md、insight.md 等上游产出时，先读取再动笔（mc-cmo 路由时会自动注入，直接调用时由本技能自己读）。
4. 初始化：`node "$SCRIPTS_DIR/setup.mjs" --slug "{slug}" --skill "mc-content" --step "content"`
5. 把完整产出（含交付卡）写入 `/tmp/mc-{slug}-content.md`，不在对话中输出正文。
6. 后处理：`node "$SCRIPTS_DIR/finalize.mjs" --slug "{slug}" --step "content" --file "content/{平台}.md" --skill "mc-content" --input /tmp/mc-{slug}-content.md`，把输出原样返回用户，不添加任何内容。
7. 找不到脚本或没有 node 时不要中断：
   - 直接把产出写入 `campaigns/{slug}/content/{平台}.md`；
   - `.status.json` 不存在时先写入 `{"campaignSlug":"{slug}","status":"running","steps":{},"review_loop":{"iteration":0,"max":3}}`，再把 `steps.content` 记为 `{"status":"done","file":"content/{平台}.md"}`；
   - 对话中只输出交付卡，并在其下加一行 `⚙️ 降级模式：未使用 setup/finalize 脚本（WebUI 状态可能不实时）`。

### ICE 评分

给出行动建议时，统一附 ICE 评分（Impact × Confidence × Ease，各 1-10）。

| 字段 | 说明 |
|------|------|
| Impact | 这个动作做了后对核心目标的影响有多大（10=改变全局，1=几乎无感）|
| Confidence | 对这个建议有效性的信心（10=确定有效，1=纯猜测）|
| Ease | 落地的难易度（10=今天就能做，1=需要 3 个月重构）|

**输出格式**：在建议列表中增加 ICE 列，按 ICE 总分降序排列。用户可以直接从最高分开始执行。

**Confidence 与数据在场性挂钩**：该建议若无实时检索数据或用户实际数据支撑（产出标注了 ⚠️ 未检索实时数据 / 行业基线假设），Confidence 上限为 5，且在该行备注「基于经验判断」。防止无依据的高自信污染排序。

<!-- mc-disciplines:end -->

---

## 交付规范

执行完成后**必须**以下方格式收尾，完整内容不得出现在对话中：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ mc-content · 内容生产完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 文件：campaigns/{slug}/content/{平台}.md
        （共 {N} 个平台文件）

📌 执行摘要
   · 覆盖平台：{平台列表}
   · 内容角度：共 {N} 个，核心钩子：{最强的1个}
   · 合规提醒：{如有高风险项，否则"无重大合规风险"}

➡️  下一步：交 mc-review 做品牌+合规审核
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

如需展开查看任意平台内容，用户说"展开 {平台} 内容"即可。
