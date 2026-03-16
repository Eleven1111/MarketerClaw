# MarketerClaw

一个面向中国营销从业者的工作流系统原型：
- 输入营销 brief，而不是聊天式 prompt
- 按角色推进策略、内容、渠道和审核环节
- 内置中国营销语境的 skills 包和模板
- 输出策略摘要、内容资产、渠道动作、审核意见与复盘建议

## 当前能力

1. 营销 brief 配置
- 项目名称、产品/服务、营销 brief
- 目标、人群、品牌调性、预算范围、KPI
- 主平台 / 次平台设置
- 活动窗口、重点区域、核心卖点、竞品观察
- 结构化竞品导入：`竞品名 | 平台 | 动作 | 信息角度 | 可攻击点`
- 支持导入 `CSV / TSV / TXT` 竞品文件，并提供 TSV 模板下载
- 导入后自动去重，并按价格促销 / 达人种草 / 付费投放等类型归类
- 渠道约束与交付要求
- 风险边界与交付要求

2. 工作流模板
- `新品上市作战`
- `节点大促推进`
- `内容矩阵生产`
- `周报与复盘`
- `自定义营销工作流`

3. 营销角色
- 必选：需求分诊台、策略负责人、内容策划、渠道投放、品牌审校、合规审查
- 可选：数据分析、营销自动化、知识运营
- 每个角色都可以单独绑定模型配置

4. Skills 包
- `campaign_brief_parser`
- `audience_persona_cn`
- `message_house`
- `campaign_architecture`
- `content_calendar_cn`
- `xiaohongshu_copy`
- `douyin_script`
- `wechat_article`
- `channel_mix_cn`
- `media_budget_planner`
- `competitor_scan_cn`
- `ad_compliance_cn`
- `brand_voice_guard`
- `private_domain_funnel`
- `campaign_report_cn`

5. 运行与交付
- 后端按阶段执行工作流
- SSE 流式推送实时进度
- 输出审核结论、风险等级、下一步动作
- 生成审核门禁、资产看板、团队编制快照
- 支持历史运行列表与一键重跑
- 支持从指定角色 / 指定环节开始定向重跑
- 生成竞品洞察、平台打法卡、平台专用资产卡和内容矩阵
- 平台专用资产细化到小红书笔记卡、抖音脚本卡、微信长文框架
- 平台专用资产可单独导出为 Markdown / JSON / PDF
- 支持按单个平台导出执行单页，直接分发给内容、渠道或代理商
- 导出 Markdown / JSON / PDF

6. Agent Registry
- 为每个营销角色提供 codename、职责、默认输出和审批范围
- 前端可直接查看角色编制和默认能力包
- 为后续迁移到更完整的多 Agent 体系保留注册表结构

## 技术栈

- 前端：React + Vite + TypeScript
- 后端：Node.js + Express + TypeScript
- 校验：Zod

## 本地运行

```bash
npm install
npm run dev
```

- 前端：`http://localhost:5173`
- 后端：`http://localhost:8787`

生产构建与启动：

```bash
npm run build
npm run start
```

如果要挂在子路径下，例如 `/marketing`：

```bash
APP_BASE_PATH=/marketing npm run build
APP_BASE_PATH=/marketing PORT=8788 NODE_ENV=production npm run start
```

此时访问地址会变成：
- `http://localhost:8788/marketing`
- `http://localhost:8788/marketing/api/health`

如果服务端已经配置了模型环境变量，页面里的 `apiKey` 可以留空：
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_BASE_URL`（可选，默认 `https://api.openai.com`）
- `GOOGLE_API_KEY`
- `GOOGLE_MODEL`
- `VOLCENGINE_API_KEY`
- `VOLCENGINE_MODEL`

工作流历史会落盘到 `server/data/workflows`。新版本会自动清除落盘文件中的明文 `apiKey`，避免把密钥跟着部署包迁移。

## API

### `GET /api/health`
健康检查。

### `GET /api/workflows/setup`
返回角色目录、模板、skills 包、平台列表与默认参数。

### `POST /api/workflows`
创建并执行一个营销工作流，返回完整结果。

### `GET /api/workflows`
返回历史运行列表摘要。

### `POST /api/workflows/stream`
以 `text/event-stream` 方式流式返回执行过程。事件类型：
- `meta`
- `stage_start`
- `step`
- `stage_end`
- `done`
- `error`

### `GET /api/workflows/:id`
查询某次工作流执行。

### `POST /api/workflows/:id/rerun`
使用原始请求参数重跑指定工作流，并在结果中记录 `rerunOf`。

### `POST /api/workflows/:id/rerun-from`
支持从指定角色或环节开始重跑。请求体示例：

```json
{
  "roleId": "brandReviewer"
}
```

或：

```json
{
  "stageId": "review_gate"
}
```

系统会保留上游结果，只重算指定起点之后的阶段。

### `GET /api/workflows/:id/export?format=...`
支持：
- `markdown`
- `json`
- `pdf-summary`
- `pdf-full`
- `platform-assets-markdown`
- `platform-assets-json`
- `platform-assets-pdf`
- `platform-asset-onepager-markdown&platform=<平台名>`
- `platform-asset-onepager-pdf&platform=<平台名>`

## 模型接入

每个角色支持以下模型模式：
- `mock`
- `openai`
- `google`
- `volcengine`

其中：
- OpenAI 兼容模式请求：`{baseUrl}/v1/chat/completions`
- Google 默认端点：`https://generativelanguage.googleapis.com/v1beta/openai`
- 火山引擎默认端点：`https://ark.cn-beijing.volces.com/api/v3`

## 当前定位

这是一个“营销协作系统原型”，重点是：
- 用营销领域模型替代通用 agent 对话
- 把品牌审校和合规审查做成固定流程节点
- 把团队编制、审核门禁和交付资产做成结构化对象
- 支持历史运行与重跑，便于反复优化同一 campaign
- 支持定向介入执行，从单个角色或环节开始继续推进
- 为后续迁移到更完整的多 Agent / OpenClaw 体系提供母版
