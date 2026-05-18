# 账本协议AGENT 与 治理AGENT 职责拆分短规范（一页版）

> 版本：v1  
> 日期：2026-05-18  
> 状态：active  
> 目标：解耦“账本协议迭代”与“代码合并/冲突治理”，保证协作稳定、可审计、可持续复盘。

## 1. 一句话定义

- 账本协议AGENT：负责“任务清单/账本协议/协作规则文档”的持续迭代与对话讨论，不承担合并与冲突处理。
- 治理AGENT：负责“合并门禁 + 冲突解决 + 分支收口”，不承担账本协议字段与任务清单维护。

## 2. 默认工作区

协作默认以 `7-ARTIFACT-HUB-V2/**` 为核心工作区；每个 AGENT 自建 `agent/*` 分支并提交独立 PR。例外文件必须在 `STARTED/UPDATED` 显式声明。

## 3. 权限边界（硬约束）

### 3.1 账本协议AGENT（Ledger/Protocol）

允许修改范围（仅限以下路径）：

- `AGENT协作工具/ledger/**`
- `docs/superpowers/contracts/**`
- `AGENT协作工具/docs/**`

禁止修改范围（必须 fail-closed）：

- `.github/workflows/**`
- `AGENT协作工具/github-actions/**`
- `AGENT协作工具/SKILLS/**`（除非是纯文档性说明且不改变门禁行为）

输出职责：

- 维护任务清单：任务树、依赖、状态、下一步行动
- 维护协议与字段：contracts、协作评论字段、ledger 字段含义
- 对话中产出可落地的变更 PR：只涉及“允许修改范围”

### 3.2 治理AGENT（Merge/Conflict Governance）

允许修改范围：

- `7-ARTIFACT-HUB-V2/**`（以及 PR 已声明的例外范围）
- `.github/**` 与 `AGENT协作工具/github-actions/**`（仅限治理/门禁/自动化所必需）

禁止修改范围（必须 fail-closed）：

- 不得直接修改 `AGENT协作工具/ledger/**` 来“凑齐门禁”
- 不得在未发 `UPDATED` 的情况下扩 scope

输出职责：

- 冲突识别与处置：识别冲突类型，选择 rebase/救援分支/替代 PR 策略
- 合并门禁执行：确保 lifecycle-guard 与关键 checks 全绿，再合并并删除分支
- 协调与分流：当 PR 需要协议/任务清单变更时，转交给账本协议AGENT 产出独立 PR

## 4. 协作接口（两者如何对齐）

- 账本协议AGENT 产出：任务清单更新 + 协议文档更新（可合并的 PR）
- 治理AGENT 消费：以主干最新协议与任务清单为真源，执行合并与冲突治理
- 冲突策略优先级：
  - PR 元数据/分支名不同步风险：优先“新分支 + 新 PR 替代收口”
  - 大规模 add/add 冲突：优先“救援分支（从 main 拉干净基线 + 按路径搬运有效改动）”

## 5. 复盘清单（治理AGENT必填）

- 本次冲突类型（rename 不同步 / add-add / rebase 失败 / merge dirty 等）
- 采用的收口策略（替代 PR / 救援分支 / 常规 rebase）
- 产生阻塞的门禁条目与补齐方式（Task Card / DESIGN_REVIEW / REVIEWER / TEST_REPORT / DONE 等）
- 对任务清单的影响（是否需要账本协议AGENT 更新任务状态或协议字段）

