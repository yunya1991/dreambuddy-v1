# Phase 2 协作闭环：最小补齐方案清单（A/B/C/D）

> 目标：把“Phase 2 协作链唯一阻塞点（必须人工写账本/发验收清单）”变成可由账本协作AGENT + 治理AGENT 自动完成的标准闭环。
>
> 约束：本文只给出**要补的文件/规则/触发方式**与“哪些必须脚本化/哪些可用自然语言提示词完成”，不展开代码实现细节。

## 0. 背景与问题定义

当前系统出现的 Phase 2 阻塞点可抽象为：

1. **输入端**：给定一个主要项目工作区（例如 `7-ARTIFACT-HUB-V2`）与一组架构/设计文档；
2. **规划端**：需要把设计意图转成可执行任务树（ledger tasks），并可持续迭代；
3. **治理端**：需要把任务从 `planned` 推进到“可执行态”（俗称 ready），并发布验收清单；
4. **执行/验证端**：需要在工作区产生可追溯的运行态证据（task/result、CI、日志）；
5. **观测端**：需要把“协作账本任务”与“工作区运行态证据”聚合成一个可查询视图，避免执行黑箱；
6. **收口端**：治理AGENT需要能自动合并已验证分支、删除分支、处理冲突，避免工作区堆积。

其中第 3 点（治理推进 + 验收清单发布）若缺失，就会形成“唯一阻塞点必须人工处理”。

## 1. 统一语义（必须先定死）

### 1.1 “ready”的标准映射（必须规则化）

- 本协作系统中不引入新 status=`ready`（避免破坏 open_tasks 与既有脚本假设）。
- 统一把“ready”映射为：`status = accepted`
- 含义：任务已具备验收清单，可进入开发/验证/治理自动化流水线。

### 1.2 验收清单（Acceptance Checklist）的最小可机读形态（必须规则化）

每个进入 `accepted` 的任务必须在 ledger 内具备可机读的“验收要求”入口，二选一即可：

- **形态 A（推荐，纯账本字段）**：写入 `tasks/index.json` 的
  - `next_required_action`（一句话、可执行）
  - `sync_checkpoint[]`（必须引用本任务相关的设计/规范/实现真源文件路径）
- **形态 B（文件化清单）**：生成 `7-ARTIFACT-HUB-V2/acceptance/task-<task_id>.md` 并在 `sync_checkpoint[]` 引用该文件

## 2. 缺口 A/B/C/D：最小补齐清单

### 2.1 缺口 A（P0）：planned -> accepted 的标准治理推进动作

**问题**：系统已有 accepted->ledgered 等治理迁移，但缺“planned -> accepted（ready）”的标准动作入口，导致治理推进只能人工写账本或靠零散 PR。

**必须补齐（脚本化，P0）**

- **新增/补齐的文件（建议归属）**
  - `AGENT协作工具/github-actions/ledger_governance_promote.py`（建议新增）
    - 输入：`--task-id ...`（支持多次）、`--to accepted`、`--workspace-path ...`
    - 行为：按规则修改 `AGENT协作工具/ledger/tasks/index.json` 并更新 open_tasks 视图
- **硬规则（脚本必须强制）**
  - 只允许 `planned -> accepted`（不允许跳跃）
  - 推进时必须写入 `next_required_action` 或 `sync_checkpoint`（见 1.2）
  - 只能作用于指定 `workspace_path` 范围内的任务（避免误写其它工作区）

**可用自然语言提示词完成（P0，但不强依赖脚本）**

- “验收清单的内容怎么写”可以由 LLM 生成，但**生成结果必须落到机读字段**（1.2）。

**触发方式（推荐）**

- 治理AGENT在发现 Phase 2 阻塞时，直接触发 `ledger_governance_promote.py`
- 或将其作为 governance workflow 的一个步骤（在 merge/冲突处理前做一次状态推进检查）

---

### 2.2 缺口 B（P0）：验收清单发布机制缺少统一落点与格式

**问题**：目前“发布验收清单”没有强制落点，导致各人各写、难以让自动化识别。

**必须补齐（规则化，P0）**

- “验收清单”对机器而言只认 1.2 的两种形态（A 或 B），其它表达方式（PR 评论、聊天）只能视为辅助证据。
- 对进入 `accepted` 的任务：必须具备
  - `sync_checkpoint[]`：至少 1 条“真源文档路径”，用于对齐范围与验收依据
  - `next_required_action`：一句话描述“谁在何处完成什么，如何验收”

**可用自然语言提示词完成（P0）**

- 从架构文档中提取“验收点”与“失败条件”可以由 LLM 生成，输出结构固定为：
  - `Acceptance Criteria:`（3-7 条）
  - `Non-goals:`（0-3 条）
  - `Evidence Required:`（必须包含：build/test、关键接口/文件、日志位置）
  - `Fail-Closed:`（若有 L3 风险项必须列出）

**触发方式（推荐）**

- 由账本协作AGENT在生成/更新任务树时自动补齐（prompt 生成 + 写入 ledger 字段）
- 由治理AGENT在推进 `planned->accepted` 时强制校验（无则拒绝推进）

---

### 2.3 缺口 C（P0）：从“架构文档集合”到“可解析规划文件”的桥接层

**问题**：现有“任务拆解 SKILL（规则解析）”只能稳定解析**规划 Markdown**（`## Phase` + `- Task`），但你给的通常是一组架构/设计文档，并非规划任务列表。

**必须补齐（自然语言规则 + 轻量脚本化，P0）**

- **自然语言规则（LLM 产出必须遵守）**
  - 输出一个单独的 `PROJECT_PLAN.md`（或 `PHASE2_PLAN.md`），严格遵循：
    - `# <项目名>`
    - `## Phase 1/2/3...`
    - `- [ ] <任务>`（每条任务一句话，避免长段落）
  - 每个 Phase 下至少 3 个任务、最多 10 个任务（避免过细/过粗）
  - 每条任务必须能落到一个明确工作区路径（例如 `7-ARTIFACT-HUB-V2/src/...` 或 `AGENT协作工具/...`）
- **脚本化部分（复用既有）**
  - 使用 `collab-ledger-planner` 的 `plan_to_tasks.py` 将 `PROJECT_PLAN.md` 解析为 tasks 草案并可 `--apply` 落账本

**触发方式（推荐）**

- 账本协作AGENT：收到“主项目 + 架构文档集合”后，先用提示词生成 `PROJECT_PLAN.md`，再调用 `plan_to_tasks.py --apply`

---

### 2.4 缺口 D（P1）：把运行态 evidence 强绑定到 ledger_task（真正闭环）

**问题**：要让“桥聚合视图”真正有价值，工作区运行态（task/result、CI run）必须可回指到 ledger_task。

**必须补齐（规则化，P1）**

- 任何从 ledger task 发起的工作区执行，必须携带 `ledger_task_id`（作为 join key）
- 运行态 evidence 最小要求（至少满足其一）：
  - `dreambuddy/artifacts/tasks/task_*.json` 内含 `ledger_task_id`
  - 或 PR/CI 评论中含 `Task ID: <ledger_task_id>` 且能被 governance/claim-guard 解析

**脚本化部分（P1）**

- 通用桥 CLI：`AGENT协作工具/github-actions/ledger_workspace_bridge.py`（已存在/已验证）
  - 输入：`--workspace-path`（可切换工作区）
  - 输出：稳定 JSON（open ledger tasks join hub task/result）

**触发方式（推荐）**

- ops/治理查询：通过 Hub 的 `GET /ops/ledger/open-tasks?workspace_path=...`
- 账本协作AGENT：定时跑桥 CLI，发现“open task 长期无 evidence”则发 BLOCKED/UPDATED（策略可后续补）

## 3. 散落文件索引（全部“归入本文件内”的索引区）

> 目的：后续要拆成独立项目时，先保证“入口与索引”集中在一个地方，避免能力散落不可发现。

### 3.1 账本真源与模板

- 账本真源：`AGENT协作工具/ledger/tasks/index.json`
- 任务模板：`AGENT协作工具/ledger/templates/task-record.json`

### 3.2 账本关键脚本（已存在）

- open_tasks 视图刷新：`AGENT协作工具/github-actions/refresh_open_tasks.py`
- 账本写入与治理迁移：`AGENT协作工具/github-actions/update_agent_ledger.py`
- 治理闭环 runner：`AGENT协作工具/github-actions/run_governance_ledger_cycle.py`

### 3.3 工作区↔账本聚合桥（已存在）

- 通用桥 CLI：`AGENT协作工具/github-actions/ledger_workspace_bridge.py`

### 3.4 任务拆解 SKILL（已存在）

- SKILL 入口：`AGENT协作工具/SKILLS/collab-ledger-planner/SKILL.md`
- 规则解析器：`AGENT协作工具/SKILLS/collab-ledger-planner/plan_to_tasks.py`

### 3.5 治理自动化（workflow 侧）

- 开发/验证/治理 dispatch workflows：`.github/workflows/collab-*-agent.yml`

### 3.6 典型工作区与真源架构文档集合（输入侧）

- 主项目工作区（示例）：`7-ARTIFACT-HUB-V2`
- 典型输入文档（示例）：
  - `1-ARCHITECTURE/中台设计/COMPANY_CENTRAL_HUB.md`
  - `7-ARTIFACT-HUB-V2/BOARD_CONSOLE_DESIGN.md`
  - `7-ARTIFACT-HUB-V2/CHAIN_WORKFLOWS.md`
  - `7-ARTIFACT-HUB-V2/GOVERNANCE_SPEC.md`
  - `7-ARTIFACT-HUB-V2/MARKET_CONSOLE_DESIGN.md`
  - `7-ARTIFACT-HUB-V2/OBJECT_MODEL.md`
  - `7-ARTIFACT-HUB-V2/OPS_UI_README.md`

### 3.7 遗留/散落的 bridge 产物（需要标注为“非真源”）

- `7-ARTIFACT-HUB-V2/dist/ledger-bridge.js` 与 `7-ARTIFACT-HUB-V2/dist/ledger-bridge.test.js`
  - 说明：属于构建产物或历史残留，不应作为协作系统真源；后续如要保留，应迁入独立包并发布版本。

## 4. 拆分为独立项目（建议，不在本轮落地）

当你准备把协作系统能力复用于“所有项目”时，建议拆成 4 个可复用包（每个包有独立 README/版本/测试）：

1. `collab-ledger-core`：ledger schema + open_tasks 刷新 + 状态迁移
2. `collab-ledger-planner`：规划 Markdown -> tasks 草案/写入
3. `workspace-ledger-bridge`：workspace runtime（task/result/CI） -> 聚合视图
4. `collab-governance-autoclose`：治理合并/删分支/冲突救援/压力测试策略

## 5. Phase 2 不再出现“唯一阻塞点”的判定标准

只要同时满足以下 3 条，就认为 Phase 2 的“治理推进”不再依赖人工：

1. planned->accepted（ready）存在标准入口（脚本/流程可触发），且推进时强制校验验收清单落点；
2. 验收清单具备机读形态（1.2），治理/验证自动化能据此判断是否可执行与如何验收；
3. 运行态 evidence 能回指 ledger_task（至少具备 ledger_task_id join key 或等价可解析证据）。

## 附录 A：Phase 2 “ready(accepted) 推进 + 验收清单机读落点”一页 SOP

> 适用对象：治理AGENT、账本协作AGENT。
>
> 目标：把 Phase 2 的唯一阻塞点（planned->ready + 发布验收清单）变成一套固定操作，不再依赖人工“临场补写账本”。

### A1. 输入（必须齐全）

- 主工作区：例如 `7-ARTIFACT-HUB-V2`
- 架构/设计真源文档集合（作为验收依据）：例如
  - `1-ARCHITECTURE/中台设计/COMPANY_CENTRAL_HUB.md`
  - `7-ARTIFACT-HUB-V2/BOARD_CONSOLE_DESIGN.md`
  - `7-ARTIFACT-HUB-V2/CHAIN_WORKFLOWS.md`
  - `7-ARTIFACT-HUB-V2/GOVERNANCE_SPEC.md`
  - `7-ARTIFACT-HUB-V2/MARKET_CONSOLE_DESIGN.md`
  - `7-ARTIFACT-HUB-V2/OBJECT_MODEL.md`
  - `7-ARTIFACT-HUB-V2/OPS_UI_README.md`

### A2. 从“文档集”生成可解析 Project Plan（自然语言完成）

用 LLM 生成一个规划文件（强制结构）：

- 文件名（推荐）：`7-ARTIFACT-HUB-V2/PROJECT_PLAN.md`
- 输出必须严格满足：
  - 顶层 `# <项目名>`
  - 至少 1 个 `## Phase ...`
  - Phase 下使用 `- [ ] <任务>` 列表项
  - 每条任务一句话，并能落到明确路径（`7-ARTIFACT-HUB-V2/...` 或 `AGENT协作工具/...`）

### A3. 将 Project Plan 拆解写入协作账本（脚本化完成）

在仓库根目录执行：

```bash
python3 AGENT协作工具/SKILLS/collab-ledger-planner/plan_to_tasks.py \
  --plan 7-ARTIFACT-HUB-V2/PROJECT_PLAN.md \
  --goal-id goal-phase2-7-artifact-hub-v2 \
  --task-prefix phase2-ahv2 \
  --workspace-path 7-ARTIFACT-HUB-V2 \
  --apply
```

产物：
- `AGENT协作工具/ledger/tasks/index.json` 新增 tasks 草案（默认 status=planned）

### A4. 为“planned -> accepted(ready)”准备验收清单（自然语言生成 + 机读落点）

对每个准备推进到 accepted 的 task，准备两类信息（二选一即可，推荐 A）：

- 机读落点 A（推荐）：写入任务字段
  - `next_required_action`: 一句话明确“谁在何处完成什么，如何验收”
  - `sync_checkpoint[]`: 至少 1 条引用本任务相关真源文档路径（上面 A1 的那组路径是最小集）
- 机读落点 B（文件化）：生成 `7-ARTIFACT-HUB-V2/acceptance/task-<task_id>.md`，并将该文件路径写入 `sync_checkpoint[]`

### A5. 推进 planned -> accepted（脚本化完成，强制校验验收清单）

在仓库根目录执行（示例一次推进 3 个 Phase 2 任务）：

```bash
python3 AGENT协作工具/github-actions/ledger_governance_promote.py \
  --workspace-path 7-ARTIFACT-HUB-V2 \
  --to accepted \
  --task-id <task_id_1> \
  --task-id <task_id_2> \
  --task-id <task_id_3> \
  --next-required-action "developer: implement; validator: validate; governance: merge" \
  --sync-checkpoint 7-ARTIFACT-HUB-V2/OBJECT_MODEL.md \
  --sync-checkpoint 7-ARTIFACT-HUB-V2/GOVERNANCE_SPEC.md
```

硬约束：
- 若 `next_required_action` 与 `sync_checkpoint[]` 均为空：脚本必须拒绝推进（避免“空验收清单 accepted”）
- 若 task 不属于 `workspace_path`：脚本必须拒绝推进（避免误写其他工作区）

### A6. 验证“ready 后不再黑箱”（脚本化观测）

用桥聚合视图检查 open tasks 是否能 join 到工作区运行态证据：

```bash
python3 AGENT协作工具/github-actions/ledger_workspace_bridge.py \
  --workspace-path 7-ARTIFACT-HUB-V2 \
  --limit 50
```

验收要点：
- `open_tasks_total` 与 `items[].ledger_task` 对齐
- 若 `hub_task/hub_result` 长期为空，说明执行链路未写入 `ledger_task_id`（需要在工作区执行入口补齐 ledger_task_id 传递）
