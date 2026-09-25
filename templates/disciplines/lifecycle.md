### 产出流程

由 mc-cmo 路由或 mc-orchestrate 编排时，slug 和执行流程以调用方为准，跳过本节。用户用 `/{{skill}}` 直接调用时，按以下步骤落盘，让文件、`.status.json` 与 WebUI 保持一致：

{{modes}}

1. 定位脚本（对话中探测一次）：
   ```bash
   for base in "${MC_HOME:-}" ~/.openclaw ~/.claude ~/.hermes .; do
     [ -n "$base" ] && [ -f "$base/scripts/setup.mjs" ] && SCRIPTS_DIR="$base/scripts" && break
   done
   echo "${SCRIPTS_DIR:-scripts not found}"
   ```
2. 确定 slug：`{品牌/产品}-{场景}-{市场}`，全小写连字符；无法推断时用 `campaign-{YYYYMMDD}`。已有同名 campaign 时沿用。
3. 加载上下文：`campaigns/{slug}/` 下已有 brand.md、storyteller.md、insight.md 等上游产出时，先读取再动笔（mc-cmo 路由时会自动注入，直接调用时由本技能自己读）。
4. 初始化：`node "$SCRIPTS_DIR/setup.mjs" --slug "{slug}" --skill "{{skill}}" --step "{{step}}"`
5. 把完整产出（含交付卡）写入 `/tmp/mc-{slug}-{{step}}.md`，不在对话中输出正文。
6. 后处理：`node "$SCRIPTS_DIR/finalize.mjs" --slug "{slug}" --step "{{step}}" --file "{{file}}" --skill "{{skill}}" --input /tmp/mc-{slug}-{{step}}.md`，把输出原样返回用户，不添加任何内容。
7. 找不到脚本或没有 node 时不要中断：
   - 直接把产出写入 `campaigns/{slug}/{{file}}`；
   - `.status.json` 不存在时先写入 `{"campaignSlug":"{slug}","status":"running","steps":{},"review_loop":{"iteration":0,"max":3}}`，再把 `steps.{{step}}` 记为 `{"status":"done","file":"{{file}}"}`；
   - 对话中只输出交付卡，并在其下加一行 `⚙️ 降级模式：未使用 setup/finalize 脚本（WebUI 状态可能不实时）`。
