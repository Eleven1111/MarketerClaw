# MarketerClaw

## 系统入口

**所有营销请求必须先经过 mc-cmo。**

mc-cmo 是 MarketerClaw 的 CMO 核心引擎，负责：
- 判断请求是否合理，必要时质疑或拦截
- 根据用户关系阶段（new/building/partner）调节干预强度
- 判断完成后交给 mc-dispatch 执行

用户也可以用 `/mc-xxx` 命令直接调用技能（mc-cmo 仍在场但不判断）。

## 技能调用顺序

```
用户请求 → mc-cmo（判断）→ mc-dispatch（路由+执行）→ 具体技能
```

## 用户画像

存储在 `memory/default/profile.md`，mc-cmo 每次对话开始加载、结束时更新。
