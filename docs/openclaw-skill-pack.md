# MarketerClaw Skill Pack — OpenClaw 接入说明

本仓库同时包含一套可直接迁移到 OpenClaw 的营销技能包：

- [marketing-orchestrator-cn](../skills/marketing-orchestrator-cn/SKILL.md) — 营销全流程编排（策略、内容、渠道、审核）
- [competitor-intel-cn](../skills/competitor-intel-cn/SKILL.md) — 竞品情报解析与反制建议
- [platform-asset-onepager-cn](../skills/platform-asset-onepager-cn/SKILL.md) — 平台执行单页资产生成
- [brand-compliance-gate-cn](../skills/brand-compliance-gate-cn/SKILL.md) — 品牌调性与广告法合规双审

## 为什么要有这个 Skill Pack？

- OpenClaw 已配置好模型，无需该项目再单独托管第二套模型调用
- 你需要的是在 OpenClaw 对话中输入自然语言 brief，自动推进策略 → 内容 → 渠道 → 审核
- OpenClaw 文档说明，技能目录可以放在 `~/.openclaw/skills` 或 `<workspace>/skills`，并在 agent run 时自动注入到系统提示中

## 安装方式

### 方案 1：全局共享给所有 OpenClaw workspace

```bash
mkdir -p ~/.openclaw/skills
cp -R skills/marketing-orchestrator-cn ~/.openclaw/skills/
cp -R skills/competitor-intel-cn ~/.openclaw/skills/
cp -R skills/platform-asset-onepager-cn ~/.openclaw/skills/
cp -R skills/brand-compliance-gate-cn ~/.openclaw/skills/
```

### 方案 2：仅在当前 OpenClaw workspace 使用

```bash
# 在你的 OpenClaw workspace 根目录下执行
mkdir -p skills
cp -R /path/to/MarketerClaw-main/skills/marketing-orchestrator-cn ./skills/
cp -R /path/to/MarketerClaw-main/skills/competitor-intel-cn ./skills/
cp -R /path/to/MarketerClaw-main/skills/platform-asset-onepager-cn ./skills/
cp -R /path/to/MarketerClaw-main/skills/brand-compliance-gate-cn ./skills/
```

## 使用方式

装好后，直接在 OpenClaw 对话中输入自然语言即可，例如：

- `给我做一个面向中国市场的新品上市 campaign`
- `把这份 brief 变成策略、内容矩阵和渠道动作`
- `帮我做小红书 + 抖音 + 微信的执行方案`
- `这是竞品信息，帮我去重、分类并给出应对建议`
- `帮我审这份文案的品牌调性和广告法风险`
- `直接给我一版小红书笔记卡和抖音脚本卡`

## 技能包已覆盖能力

| 技能包 | 对应能力 |
|--------|---------|
| `marketing-orchestrator-cn` | 角色体系、营销中文语境、完整工作流 |
| `competitor-intel-cn` | 竞品录入、去重分类、反制建议 |
| `platform-asset-onepager-cn` | 小红书/抖音/微信/微博/B站平台资产 |
| `brand-compliance-gate-cn` | 品牌审校 + 广告法合规双审 |

## 与 MarketerClaw WebUI 的关系

- **WebUI**：适合团队使用，支持表单配置 brief、角色模型绑定、实时 SSE 流、历史重跑和多格式导出
- **Skill Pack**：适合个人在 OpenClaw 对话中快速处理单次 campaign 需求

两者共享同一套营销领域逻辑；skill pack 不依赖 WebUI 运行。
