---
name: agent-dev-execution
description: 开发执行 SKILL。强制接入 implementation plan、冲突门禁与 PR 评论协议。触发词：开发执行、开始开发、execute task
version: "1.0"
created: "2026-05-17"
status: "draft"
---

# Agent Dev Execution

## 必须顺序

1. read implementation plan
2. run dual-agent-conflict-gate
3. post STARTED
4. edit files
5. post UPDATED when scope changes
6. post BLOCKED when execution cannot continue
7. post DONE after commit and push
