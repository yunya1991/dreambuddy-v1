# AGENT 协作账本

本目录是 `AGENT协作系统 v1` 的账本真源。

- `tasks/index.json`：任务总账本
- `rewards/index.json`：奖励总账本
- `templates/*.json`：账本对象模板
- `protocols/*.md`：账本清单协议（审计用的可读输出，真源仍为 `tasks/index.json`）
- `protocols/*.history.jsonl`：协议版本链记录（每次编译追加一条记录）

规则：

1. 所有正式任务必须先入账再执行
2. 账本状态高于评论状态
3. 奖励结算必须由验证者 AGENT 触发

同步：

- `{workspace}/PLAN.md`：工作区任务状态快照（由 `ledger_sync.py` 自动生成，请勿手改）
- `{workspace}/.ledger-sync.json`：记录 workspace 与 ledger 的最后同步锚点（protocol_file、ledger_sha、task_status_snapshot_sha）
