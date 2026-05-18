# AGENT 协作账本

本目录是 `AGENT协作系统 v1` 的账本真源。

- `tasks/index.json`：任务总账本
- `rewards/index.json`：奖励总账本
- `templates/*.json`：账本对象模板

规则：

1. 所有正式任务必须先入账再执行
2. 账本状态高于评论状态
3. 奖励结算必须由验证者 AGENT 触发
