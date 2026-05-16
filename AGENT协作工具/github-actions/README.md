# Agent Lifecycle Guard

本目录存放 GitHub Actions 侧使用的校验脚本与说明。

## 当前脚本

- `build_agent_lifecycle_payload.py`：把 PR 正文和结构化评论解析为标准 lifecycle payload
- `check_agent_lifecycle.py`：根据 PR 事件载荷检查任务卡、评审、评论、测试与分支规则是否齐全

## 输入载荷字段

- `pr_body`
- `branch`
- `comments`
- `review_count`
