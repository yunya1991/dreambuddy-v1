---
name: collab-ledger-planner
description: 将项目规划（Markdown）拆解为协作账本任务清单（tasks/index.json 草案）。触发词：任务拆解、规划拆解、plan to tasks、生成任务清单
version: "1.0"
created: "2026-05-18"
status: "draft"
---

# Collab Ledger Planner

## 输入

- 项目规划 Markdown 文件路径
- goal_id / task_prefix / workspace_path（可选但推荐显式提供）

## 输出

- 生成 `tasks/index.json` 兼容的任务草案（JSON）
- 规则解析为主：标题/小节/列表 → 父子任务树

## 规则（自然语言，执行时必须遵守）

1. 规划文件内 `##` 小节 = 一个父任务（phase）
2. 小节下 `-` 列表项 = 子任务（并行）
3. 若没有 `##`，则顶层 `-` 列表项直接挂在根任务下
4. 所有生成任务默认 `status=planned`，`workspace_path` 必须填充
5. task_id 必须全局唯一；生成前必须检查冲突

## 执行

- 生成草案（stdout JSON）：
  - `python3 AGENT协作工具/SKILLS/collab-ledger-planner/plan_to_tasks.py --plan <file.md> --goal-id <goal-x> --task-prefix <prefix> --workspace-path <workspace>`
- 应用到真实账本（会写入并更新 open_tasks）：
  - `python3 AGENT协作工具/SKILLS/collab-ledger-planner/plan_to_tasks.py --plan <file.md> --goal-id <goal-x> --task-prefix <prefix> --workspace-path <workspace> --apply`

