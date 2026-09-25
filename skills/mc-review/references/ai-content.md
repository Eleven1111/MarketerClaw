# 合规审查 — AI 生成内容（AIGC）

> last_verified: 2026-09-25 · 复核周期 180 天（CI 每周检查，超期报警）
> 审查对象含 AI 生成或合成的图片、视频、音频、虚拟人或数字人，或来自 `aigc.md` 的素材时，**无论法域一律加载本文件**。审查参考，不构成法律意见。

## 法规要求

| 检查项 | 风险 | 说明 | 依据 |
|--------|------|------|------|
| 中国 · 显式标识 | 高 | AI 生成合成的文本、图片、音频、视频、虚拟场景须添加用户可感知的显式标识（文字、角标、语音提示等）；可下载或导出的文件须含显式标识 | 人工智能生成合成内容标识办法（2025-09-01 起）及强制性国家标准 GB 45438-2025 [1] |
| 中国 · 隐式标识 | 高 | 文件元数据须含隐式标识；任何组织和个人不得恶意删除、篡改、伪造、隐匿标识，也不得为他人提供此类工具或服务 | 人工智能生成合成内容标识办法 [1] |
| 中国 · 平台执行 | 高 | 抖音、小红书、视频号、B站、微博等已要求发布者主动声明 AI 内容，未声明的可能被平台加标、限流、下架或封号 | 科技日报报道 [2] |
| 中国 · AI 数字人直播 | 高 | 使用 AI 生成的人物图像、视频直播带货，须依规标识，并持续向消费者提示该形象由 AI 生成 | 直播电商监督管理办法第三十七条（2026-02-01 起）[3] |
| 欧盟 | 高 | 2026-08-02 起，deepfake 须披露为人工生成或操纵；生成式 AI 服务提供者须做机器可读标记（2026-08-02 前上市的系统宽限至 2026-12） | AI Act 第 50 条 [4] |
| 美国 | 高 | 联邦层面没有通用的 AI 标注法，但 AI 生成的虚假评价、证言违法；以"真实用户"呈现的证言须来自真实用户 | 16 CFR 465 [5]；16 CFR 255.2 [6] |

## 平台规则

| 平台 | 关键规则 | 依据 |
|------|---------|------|
| YouTube | 可能被误认为真实人物、地点、事件的合成或篡改内容，上传时须在 "Altered content" 选择 Yes；明显不真实的动画、特效，或仅用 AI 写脚本等辅助生产的不需要 | YouTube 帮助中心 [7] |
| TikTok | 展示逼真场景的 AI 内容须开启 AI-generated 标签；禁止用 AI 生成私人人物形象，或用公众人物形象做商业背书 | TikTok Creator Academy [8] |
| Meta（Facebook / Instagram） | 检测到行业标准 AI 信号或用户自述时加 "AI info" 标签；用 AI 生成或显著修改的广告会在"关于此广告"中标示 | Meta Transparency Center [9] |

## 审查动作（mc-review 据此出 finding）

- 任何法域的 AI 生成素材缺少标识 → `severity: block`，修改建议写明需加的显式标识位置。
- 用 AI 生成的"真实用户"形象做种草、证言或使用体验 → 属虚构证言，`severity: block`（中国：广告法第二十八条第（四）项"虚构使用效果"；美国：16 CFR 465 / 255）。
- 用 AI 生成的 Before/After 展示护肤、减重等功效 → 属虚构使用效果，`severity: block`；只有基于真实、可复现测试的实拍对比才能使用，并须按功效宣称规则留存依据。
- 用 AI 生成公众人物形象或声音做商业背书 → `severity: block`（TikTok 等平台明确禁止 [8]，并涉及肖像权风险，需法务确认）。

## 来源

[1] 国家网信办等四部门《人工智能生成合成内容标识办法》— https://www.cac.gov.cn/2025-03/14/c_1743654684782215.htm
[2] 科技日报：AI 生成内容不得"隐身"传播，多家平台更新用户协议（二手来源）— https://www.stdaily.com/web/gdxw/2025-09/02/content_393775.html
[3] 市场监管总局《直播电商监督管理办法》— https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/fgs/art/2026/art_ce66ea61fcec4583b5dbd677f470088b.html
[4] European Commission: Quick facts — transparency rules for AI systems — https://digital-strategy.ec.europa.eu/en/factpages/quick-facts-transparency-rules-ai-systems
[5] FTC: 16 CFR Part 465 Final Rule — https://www.ftc.gov/legal-library/browse/federal-register-notices/16-cfr-part-465-trade-regulation-rule-use-consumer-reviews-testimonials-final-rule
[6] 16 CFR Part 255 (eCFR) — https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255
[7] YouTube Help: Disclosing use of altered or synthetic content — https://support.google.com/youtube/answer/14328491
[8] TikTok Creator Academy: AI-generated content label — https://www.tiktok.com/creator-academy/en/article/ai-generated-content-label
[9] Meta Transparency Center: Labeling AI content — https://transparency.meta.com/governance/tracking-impact/labeling-ai-content/
