---
name: collab-ledger-planner
description: 将项目规划/技术文档（Markdown）拆解为协作账本任务清单，并同步工作区。触发词：任务拆解、规划拆解、plan to tasks、生成任务清单、生成账本清单协议
version: "2.0"
created: "2026-05-18"
updated: "2026-05-18"
status: "active"
---

# Collab Ledger Planner

## 用途

读取技术文档或项目规划 Markdown，自动拆解为结构化账本任务，并同步到工作区。

## 输出物（三件套）

| 输出 | 路径 | 说明 |
|------|------|------|
| 账本 JSON | `AGENT协作工具/ledger/tasks/index.json` | 写入新任务，更新 open_tasks |
| 账本清单协议 | `AGENT协作工具/ledger/protocols/{WORKSPACE}-LEDGER-{YYYYMMDD}.md` | 标准化协议 Markdown |
| 工作区进度 | `{workspace}/PLAN.md` | 任务状态快照，随账本变化同步 |

### 命名规范

账本清单协议文件命名：`{WORKSPACE}-LEDGER-{YYYYMMDD}.md`

示例：`7-ARTIFACT-HUB-V2-LEDGER-20260518.md`

约定：

1. 协议文件按天命名，同一天多次 `sync` 会覆盖同名协议文件；可追溯性依赖 Git 提交历史。
2. 协议 Markdown 除基础字段外，还包含编译链路元数据（Compile ID / Supersedes / Generator / Schema / Plan Fingerprint）。
3. 同名协议文件的版本链记录写入：`{WORKSPACE}-LEDGER-{YYYYMMDD}.history.jsonl`。

## Plan Frontmatter（推荐）

在 plan 文件头部添加最小 frontmatter，用于可校验编译输入：

```md
---
goal_id: goal-x
workspace: 7-ARTIFACT-HUB-V2
task_prefix: ahv2-20260518
acceptance_required: true
---
```

校验模式（只校验不写入）：

```bash
python3 AGENT协作工具/SKILLS/collab-ledger-planner/plan_to_tasks.py \
  --plan <tech-doc.md> \
  --validate
```

## 拆解规则

1. `#` 标题 → 根任务（`task_type: serial`）
2. `##` 小节 → phase 父任务（`task_type: serial`）
3. 小节下 `-` 列表项 → 子任务（`task_type: parallel`）
4. 无 `##` 时，顶层 `-` 列表项直接挂根任务
5. task_id 格式：`task-{prefix}-{slug}-{N}`（slug 取自标题 kebab-case，最长 20 字符）
6. 默认状态：`status=planned`，`workspace_path` 必须填充
7. 写入账本前检查 task_id 冲突

## 一步完成：sync 命令（推荐）

```bash
python3 AGENT协作工具/SKILLS/collab-ledger-planner/ledger_sync.py sync \
  --plan <tech-doc.md> \
  --goal-id <goal-x> \
  --workspace 7-ARTIFACT-HUB-V2
```

这会同时完成：
1. 拆解任务 → 写入 `ledger/tasks/index.json`
2. 生成协议 Markdown → `ledger/protocols/7-ARTIFACT-HUB-V2-LEDGER-YYYYMMDD.md`
3. 写入工作区 `7-ARTIFACT-HUB-V2/PLAN.md`
4. 记录同步状态 `7-ARTIFACT-HUB-V2/.ledger-sync.json`

加 `--dry-run` 只预览不写文件。

## 状态变更后同步

```bash
python3 AGENT协作工具/SKILLS/collab-ledger-planner/ledger_sync.py push-status \
  --workspace 7-ARTIFACT-HUB-V2 \
```

说明：

1. 默认输出为纯 JSON（适用于自动化/Action 读取）。
2. 若需要直接粘贴 PR 评论，可加 `--print-comment`，会在 JSON 后额外输出评论文本。

## 查看同步状态

```bash
python3 AGENT协作工具/SKILLS/collab-ledger-planner/ledger_sync.py status \
  --workspace 7-ARTIFACT-HUB-V2
```

## 配合 GitHub Action 自动同步

当 `ledger/tasks/index.json` 在 main 分支变更时，`.github/workflows/collab-ledger-sync.yml` 会自动更新工作区 PLAN.md 并发 LEDGER_SYNC 评论。
