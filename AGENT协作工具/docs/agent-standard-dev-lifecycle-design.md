# AGENT 标准开发生命周期与协作监督体系设计

> 仓库：`dreambuddy-v1`  
> 版本：v1（Agent Standard Dev Lifecycle Design）  
> 日期：2026-05-17  
> 状态：v1 候选稿  
> 目标：为全体 AGENT 建立一套强制执行的标准研发协作体系，覆盖方案评审、实施计划、开发执行、测试验证、PR 评审、流程监督与 GitHub Actions 自动校验。

## 0. 背景

当前仓库已经具备一套双代理协作底座：

- 已有 `AGENT协作工具/SKILLS/dual-agent-conflict-gate/` 作为开工前冲突门禁；
- 已有 `STARTED / UPDATED / BLOCKED / DONE` 的 PR 评论广播协议；
- 已有主责域、共享文件、契约冻结、里程碑分支等规则；
- 已在 `PR #9` 中完成第一轮双代理协作规范固化。

但现有体系仍主要覆盖“开工前冲突预防”，尚未覆盖完整技术研发流程的其他关键环节：

- 方案评审；
- 标准实施计划；
- 单元测试、集成测试、多场景模拟测试、压力测试；
- 非主责 AGENT 参与的结构化评审；
- 合入前自动监督与 GitHub Actions 校验。

如果缺少这些环节，AGENT 即使遵守了开工前门禁，仍然可能出现以下问题：

- 直接编码而未完成方案评审，导致方向错误后返工；
- 有实现但没有测试证据，质量无法判断；
- 有测试但缺少统一标准，覆盖范围高度随意；
- 有 PR 但缺少非主责评审，形成“自己做、自己判通过”；
- 有协作规则但没有自动检查，PR 仍可能漏流程。

因此需要在现有双代理协作底座之上，再建立一套“全 AGENT 通用、全流程强制、可自动监督”的标准开发生命周期体系。

## 1. 设计目标

本设计的目标不是替代现有 `dual-agent-conflict-gate`，而是把它纳入更完整的研发流程中。

本体系的核心目标如下：

- 将“方案评审 -> 实施计划 -> 开工门禁 -> 开发执行 -> 测试验证 -> PR 评审 -> 合入监督 -> 完成归档”固化为强制生命周期；
- 将规则适用范围从“SOLO + Claude Code”扩展为“全 AGENT 通用”；
- 采用 `fail-closed` 原则，只要任一强制环节未完成，就不得进入下一阶段；
- 支持 AGENT 自治推进，只要门禁满足即可自动流转，而不要求用户逐步拍板；
- 让 GitHub PR、评论、状态检查与本地 SKILL 形成统一规则源，而不是各自为政。

本设计的成功标准如下：

- 任意 AGENT 在开始开发前必须先完成方案评审与实施计划；
- 任意共享任务都必须有结构化 PR 评论广播与非主责评审记录；
- 任意中高风险任务都必须留下测试证据包；
- GitHub Actions 可以自动识别“漏评审、漏测试、漏评论、错分支、改共享文件未声明”等违规情况；
- 新增 AGENT 时无需重写规则，只需接入同一套生命周期。

## 2. 适用范围

本体系适用于：

- 当前 `dreambuddy-v1` 仓库内的所有 AGENT 协作任务；
- 文档、契约、脚本、后端、前端、治理规则等所有需要进入 PR 的改动；
- 单代理任务、双代理任务、多 AGENT 任务；
- `agent/*` 工作分支、`milestone/*` 里程碑分支与相关 PR。

本体系暂不覆盖：

- 生产发布审批流程；
- 外部系统的变更管理平台；
- 与第三方 CI/CD 平台的深度企业级集成；
- 运行时监控与告警系统本身的建设。

## 3. 设计原则

### 3.1 全流程强制

本体系中的关键阶段全部为硬门禁，而不是“建议流程”。

任何任务若缺少以下任一项，都不得继续推进：

- 任务卡；
- 方案评审结论；
- 实施计划；
- 开工前门禁结果；
- 必要 PR 评论；
- 测试证据；
- 非主责评审；
- 合入监督通过结果；
- 完成归档记录。

### 3.2 全 AGENT 通用

规则不绑定具体代理实现，不以 `SOLO` 或 `Claude Code` 为唯一假设，而是抽象为：

- `owner_agent`：当前任务主责 AGENT；
- `reviewer_agent`：非主责评审 AGENT；
- `supervisor_agent`：执行流程监督的 AGENT 或自动化检查。

### 3.3 AGENT 自治推进

在本体系下，AGENT 只要满足当前阶段的输入、输出与门禁要求，即可自动进入下一阶段。

用户的角色从“逐步审批每个动作”转为：

- 确认顶层方向；
- 查看关键里程碑；
- 在重大架构或业务目标变更时介入。

### 3.4 单一规则源

所有流程规则应以仓库内文档和 SKILL 为准，GitHub Actions 只负责自动核验，不应成为规则源本身。

也就是说：

- SKILL 负责定义“应该怎么做”；
- GitHub Actions 负责检查“是否真的这样做了”。

### 3.5 默认并行、关键点同步

生命周期强制不等于执行过程必须默认串行。

在本体系下，推荐将执行策略调整为：

- owner 目录内默认并行开发；
- 白名单小修复允许直接接管；
- 仅在共享文件、冻结契约、边界变更、主分支合并等关键节点强制同步；
- review 默认按阶段包进行，而不是对每个微小提交逐次 review。

该执行策略的详细定义见：

- `AGENT协作工具/docs/agent-efficient-collaboration-mode.md`

## 4. 总体架构

推荐采用“1 个主流程 SKILL + 4 个子 SKILL”的结构：

- `agent-standard-dev-lifecycle`
- `agent-design-review`
- `agent-dev-execution`
- `agent-quality-test`
- `agent-collab-supervisor`

其中：

- 主流程 SKILL 负责状态机编排；
- 子 SKILL 负责各自职责域内的规则执行与结构化输出；
- 现有 `dual-agent-conflict-gate` 保留，作为开发执行阶段的前置技术门禁；
- GitHub Actions 作为自动监督层，对应监督 SKILL 的规则集。

## 5. 生命周期阶段模型

本体系定义 9 个阶段：

### 5.1 Phase 0：任务登记

将任务写成标准任务卡，明确范围、边界、依赖、主责与完成定义。

### 5.2 Phase 1：方案评审

在任何编码前完成方案评审，确保“做什么、为什么这样做、风险在哪里”清楚可评。

### 5.3 Phase 2：实施计划

将方案转为可执行步骤、测试矩阵、PR 评论计划和回滚策略。

### 5.4 Phase 3：开工门禁

在改文件前执行分支、共享文件、契约冻结、冲突风险等检查，并发 `STARTED` 评论。

### 5.5 Phase 4：开发执行

按主责域实施改动；默认允许 owner 在已声明目录内并行推进，范围变化需发 `UPDATED`，中途受阻需发 `BLOCKED`。

### 5.6 Phase 5：测试验证

完成单元测试、集成测试、多场景模拟测试、压力测试或明确豁免说明。

### 5.7 Phase 6：PR 评审

由非主责 AGENT 给出结构化评审结论，拒绝“自己做、自己判通过”。

### 5.8 Phase 7：合入监督

检查流程是否完整、证据是否齐全、规则是否违规，并给出最终监督结论。

### 5.9 Phase 8：完成归档

发 `DONE` 评论，记录提交、测试、遗留风险和复盘摘要，释放占用范围。

## 6. 统一状态模型

### 6.1 生命周期状态

统一使用以下阶段状态：

- `READY`
- `IN_PROGRESS`
- `PASS`
- `REWORK`
- `BLOCK`
- `DONE`

含义如下：

- `READY`：当前阶段可开始；
- `IN_PROGRESS`：当前阶段执行中；
- `PASS`：当前阶段通过，可进入下一阶段；
- `REWORK`：需要补充或修改后重跑本阶段；
- `BLOCK`：存在硬性问题，禁止继续；
- `DONE`：生命周期已归档完成。

### 6.2 PR 协作状态词

统一使用以下评论状态词：

- `STARTED`
- `UPDATED`
- `BLOCKED`
- `DONE`

### 6.3 评审状态词

统一使用以下评审结论：

- `APPROVED`
- `CHANGES_REQUESTED`
- `REJECTED`

### 6.4 测试状态词

统一使用以下测试结论：

- `TEST_PASS`
- `TEST_FAIL`
- `RISK_ACCEPTED`

### 6.5 监督状态词

统一使用以下监督结论：

- `SUPERVISION_PASS`
- `SUPERVISION_REWORK`
- `SUPERVISION_BLOCK`

## 7. 主流程 SKILL 与子 SKILL 边界

### 7.1 主流程：`agent-standard-dev-lifecycle`

职责：

- 读取任务卡；
- 判断任务当前所处阶段；
- 依次调用对应子 SKILL；
- 汇总每阶段输出；
- 决定是否允许进入下一阶段。

不负责：

- 不直接编写业务代码；
- 不直接执行测试；
- 不直接替代 GitHub Actions；
- 不直接替代人工或其他 AGENT 的评审动作。

### 7.2 子 SKILL：`agent-design-review`

职责：

- 检查方案是否存在；
- 检查边界、依赖、风险、输入输出是否清晰；
- 给出 `APPROVED / CHANGES_REQUESTED / REJECTED` 结论；
- 输出结构化方案评审记录。

### 7.3 子 SKILL：`agent-dev-execution`

职责：

- 将已通过评审的任务转入开发；
- 校验或生成实施计划；
- 调用 `dual-agent-conflict-gate`；
- 强制发 `STARTED / UPDATED / BLOCKED / DONE` 评论；
- 记录开发产物、改动摘要和交接说明。

### 7.4 子 SKILL：`agent-quality-test`

职责：

- 定义测试矩阵；
- 收集单元测试、集成测试、多场景模拟测试、压力测试证据；
- 输出测试报告与质量结论。

### 7.5 子 SKILL：`agent-collab-supervisor`

职责：

- 检查任务是否漏流程；
- 检查证据与评论是否完整；
- 检查分支、共享文件、评审与测试是否合规；
- 给出 `SUPERVISION_PASS / SUPERVISION_REWORK / SUPERVISION_BLOCK` 结论；
- 为 GitHub Actions 提供规则映射基础。

## 8. 各阶段强制输入、输出与退回规则

### 8.1 Phase 0：任务登记

强制输入：

- `task_name`
- `goal`
- `owner_agent`
- `files_in_scope`
- `files_protected`
- `contracts_depended`
- `definition_of_done`

强制输出：

- 标准任务卡；
- 初始风险清单；
- 目标 PR 与目标分支信息。

退回规则：

- 任一关键字段缺失 -> `REWORK`
- 主责不清或范围不清 -> `REWORK`

### 8.2 Phase 1：方案评审

强制输入：

- 需求描述；
- 方案摘要或 spec；
- 风险点；
- 依赖模块或依赖契约；
- 非目标范围说明。

强制输出：

- 方案评审记录；
- 评审结论；
- 风险处理建议；
- 是否允许进入实施计划。

退回规则：

- 边界不清 -> `REWORK`
- 关键依赖未定义 -> `BLOCK`
- 与现有架构明显冲突且无缓解方案 -> `BLOCK`

### 8.3 Phase 2：实施计划

强制输入：

- 已通过的方案评审结论；
- 标准任务卡；
- 风险清单。

强制输出：

- 实施步骤；
- 文件改动清单；
- 测试矩阵草案；
- PR 评论计划；
- 回滚或退回策略。

退回规则：

- 无测试计划 -> `REWORK`
- 无共享文件策略 -> `REWORK`
- 依赖未冻结契约 -> `BLOCK`

### 8.4 Phase 3：开工门禁

强制输入：

- 实施计划；
- 当前分支；
- 计划修改文件；
- 依赖契约。

强制输出：

- `dual-agent-conflict-gate` 结果；
- `STARTED` 评论；
- 当前占用范围记录。

退回规则：

- 分支不合法 -> `BLOCK`
- 共享文件占用冲突 -> `BLOCK`
- 未发 `STARTED` 评论 -> `BLOCK`

### 8.5 Phase 4：开发执行

强制输入：

- 已通过的开工门禁；
- 已广播的 `STARTED`；
- 可执行实施步骤。

强制输出：

- 开发产物；
- 改动摘要；
- 必要时的 `UPDATED` 评论；
- 受阻时的 `BLOCKED` 评论。

退回规则：

- 范围漂移未声明 -> `BLOCK`
- 擅自修改共享文件或共享契约 -> `BLOCK`
- 中途发现方案不成立 -> 回退 `Phase 1`

### 8.6 Phase 5：测试验证

强制输入：

- 已完成改动；
- 测试矩阵；
- 风险点。

强制输出：

- 单元测试结果；
- 集成测试结果；
- 多场景模拟测试结果；
- 压力测试结果或豁免说明；
- 测试结论。

退回规则：

- 无测试证据 -> `BLOCK`
- 关键路径失败 -> `REWORK`
- 高风险能力缺少压测或豁免 -> `BLOCK`

### 8.7 Phase 6：PR 评审

强制输入：

- 改动摘要；
- 测试证据包；
- 风险保留项。

强制输出：

- 结构化评审意见；
- 评审结论。

退回规则：

- 发现实现偏离方案 -> 回退 `Phase 1` 或 `Phase 2`
- 发现质量问题 -> 回退 `Phase 5`
- 发现实现问题 -> 回退 `Phase 4`

### 8.8 Phase 7：合入监督

强制输入：

- 方案评审结论；
- 开发记录；
- 测试证据；
- PR 评论轨迹；
- 分支与提交状态。

强制输出：

- 监督结论；
- 缺失项清单；
- 是否允许进入完成态。

退回规则：

- 缺 `STARTED` 或 `DONE` -> `BLOCK`
- 缺测试证据 -> `BLOCK`
- 缺非主责评审 -> `BLOCK`
- 缺任务卡或方案评审记录 -> `BLOCK`

### 8.9 Phase 8：完成归档

强制输入：

- 监督通过结论；
- 最终提交信息；
- 遗留风险清单。

强制输出：

- `DONE` 评论；
- 归档摘要；
- 可复用经验与失败教训；
- 占用范围释放记录。

退回规则：

- 未发 `DONE` -> `BLOCK`
- 无归档摘要 -> `REWORK`

## 9. PR 评论与互评机制

### 9.1 PR 评论是强制广播层

PR 评论不是附属动作，而是协作协议的一部分。

评论的作用包括：

- 广播当前任务占用范围；
- 同步范围变化与阻塞；
- 留下阶段性证据；
- 作为 GitHub Actions 与监督 SKILL 的输入之一。

### 9.2 必须保留的评论状态

统一要求：

- 开工前必须发 `STARTED`
- 范围变化必须发 `UPDATED`
- 发生阻塞必须发 `BLOCKED`
- 完成后必须发 `DONE`

在高效协作模式下，上述评论仍为强制项，但推荐以“阶段广播”替代“逐动作广播”。

### 9.3 新增结构化评论类型

除现有评论状态外，建议增加两类结构化评论：

- `DESIGN_REVIEW`
- `TEST_REPORT`

其中：

- `DESIGN_REVIEW` 用于方案评审记录；
- `TEST_REPORT` 用于测试结论摘要与证据索引。

### 9.4 互评要求

互评必须满足以下要求：

- 由非主责 AGENT 参与；
- 必须给出结构化结论；
- 必须指出问题、级别、影响范围、是否阻塞；
- 不接受“看起来可以”之类无证据结论。

### 9.5 互评与角色约束

禁止以下模式：

- 主责 AGENT 自己写方案、自己判通过；
- 主责 AGENT 自己完成开发、自己给出最终 PR 通过结论；
- 在共享任务中无评审直接宣告完成。

## 10. 测试标准与质量矩阵

### 10.1 测试类型

本体系强制覆盖以下测试类型：

- 单元测试；
- 集成测试；
- 多场景模拟测试；
- 压力测试。

### 10.2 多场景模拟测试最小覆盖

至少覆盖以下场景：

- 正常路径；
- 边界输入；
- 异常输入；
- 空态或缺字段；
- 上下游异常；
- 并发或时序扰动场景。

### 10.3 压力测试最小覆盖

对中高风险任务，至少覆盖以下压力面：

- 高并发读；
- 高并发写；
- 长时运行；
- 错误高峰下的退化表现。

### 10.4 压测豁免

以下情形可以申请压测豁免，但必须显式记录：

- 纯文档任务；
- 非运行时路径的轻量配置任务；
- 当前阶段仅做设计与模板固化；
- 本次任务仅影响静态说明且不影响执行链路。

豁免不等于忽略测试，仍需给出豁免理由和风险说明。

## 11. 自动监督规则设计

建议由 `agent-collab-supervisor` 维护以下规则集：

- `RULE_001_TASK_CARD_REQUIRED`
- `RULE_002_DESIGN_REVIEW_REQUIRED`
- `RULE_003_STARTED_REQUIRED`
- `RULE_004_SCOPE_CHANGE_MUST_UPDATE`
- `RULE_005_BLOCK_MUST_ANNOUNCE`
- `RULE_006_TEST_EVIDENCE_REQUIRED`
- `RULE_007_REVIEW_BY_NON_OWNER`
- `RULE_008_DONE_REQUIRED`
- `RULE_009_BRANCH_POLICY_ENFORCED`
- `RULE_010_SHARED_FILE_DECLARATION`

规则含义如下：

- 没有任务卡，不得进入开发；
- 没有方案评审记录，不得进入开发；
- 没有 `STARTED` 评论，不得开始共享范围改动；
- 范围扩大但没有 `UPDATED`，直接阻断；
- 已阻塞但没有 `BLOCKED` 评论，视为违规；
- 没有测试证据，不得进入 PR 评审；
- 必须有非主责 AGENT 评审；
- 没有 `DONE` 评论，不得释放任务占用；
- 分支规则不合法，直接阻断；
- 修改共享文件却未声明占用，直接阻断。

## 12. GitHub Actions 接入草案

### 12.1 总控工作流

建议新增：

- `.github/workflows/agent-lifecycle-guard.yml`

触发时机建议包括：

- `pull_request.opened`
- `pull_request.edited`
- `pull_request.synchronize`
- `pull_request.reopened`
- `pull_request.ready_for_review`
- `issue_comment.created`
- `issue_comment.edited`

### 12.2 建议拆分的检查 Job

建议至少包含以下 5 个 Job：

- `task-card-check`
- `comment-protocol-check`
- `review-evidence-check`
- `test-evidence-check`
- `branch-boundary-check`

### 12.3 各 Job 目标

`task-card-check`：

- 检查是否存在任务卡或等价任务登记信息；
- 若缺失，则返回失败。

`comment-protocol-check`：

- 检查 `STARTED / UPDATED / BLOCKED / DONE` 是否存在；
- 检查评论顺序与阶段是否一致；
- 检查共享任务是否声明占用范围。

`review-evidence-check`：

- 检查是否存在方案评审记录；
- 检查是否存在 PR 评审结论；
- 检查评审是否由非主责 AGENT 给出。

`test-evidence-check`：

- 检查是否存在测试报告或测试摘要；
- 检查单元测试、集成测试、多场景模拟、压力测试或豁免是否齐全。

`branch-boundary-check`：

- 检查分支命名；
- 检查是否直接在不允许的分支上提交；
- 检查共享文件改动是否完成声明；
- 检查是否违反 `agent/*` 与 `milestone/*` 规则。

### 12.4 Action 输出结论

建议统一映射为以下结果：

- `PASS`
- `REWORK`
- `BLOCK`

默认采用 `fail-closed` 原则：

- 任一关键 Job 失败 -> `BLOCK`
- 仅缺补充性材料 -> `REWORK`
- 全部通过 -> `PASS`

## 13. 与现有 AGENT 协作工具的关系

### 13.1 保留现有冲突门禁

现有 `AGENT协作工具/SKILLS/dual-agent-conflict-gate/` 应继续保留。

其定位为：

- 开工前技术门禁；
- 检查分支、共享文件、契约冻结、边界冲突；
- 作为 `agent-dev-execution` 的前置步骤。

### 13.2 增量扩展而非推倒重来

不建议重写现有 `AGENT协作工具`，而是按目录增量扩展：

- `AGENT协作工具/SKILLS/agent-standard-dev-lifecycle/`
- `AGENT协作工具/SKILLS/agent-design-review/`
- `AGENT协作工具/SKILLS/agent-dev-execution/`
- `AGENT协作工具/SKILLS/agent-quality-test/`
- `AGENT协作工具/SKILLS/agent-collab-supervisor/`
- `AGENT协作工具/templates/`
- `AGENT协作工具/github-actions/`

### 13.3 规则分层

推荐采用如下分层：

- `conflict-gate`：能不能开始改；
- `dev-lifecycle`：当前处于哪个阶段；
- `quality-test`：改动是否足够稳；
- `collab-supervisor`：整条流程是否合规；
- `GitHub Actions`：是否需要自动阻断 PR。

## 14. 推荐落地顺序

建议按以下顺序落地：

1. 先将本设计写成正式 spec；
2. 再为 `agent-standard-dev-lifecycle` 生成 implementation plan；
3. 先固化 `agent-collab-supervisor` 的规则集；
4. 补齐 `DESIGN_REVIEW` 与 `TEST_REPORT` 模板；
5. 新建 1 个主流程 SKILL 与 4 个子 SKILL 的文档骨架；
6. 接入第一版 GitHub Actions，只检查“是否漏流程”；
7. 再逐步增强到评论顺序、共享文件声明、证据完整性等深度校验。

## 15. 风险与约束

本体系的主要风险包括：

- 初期规则较多，AGENT 需要适应；
- 若模板与动作不一致，会出现“文档写了但不执行”；
- 若 GitHub Actions 检查过早过严，可能影响推进速度；
- 若规则定义不统一，SKILL 与 Actions 可能出现判断不一致。

对应的缓解方式：

- 先统一状态词、模板、阶段定义；
- 先将规则源写入仓库文档与 SKILL，再让 Actions 做映射；
- 第一版 Actions 优先检查结构性缺口，而不是复杂语义；
- 通过主流程 SKILL 聚合多个子 SKILL 的输出，避免规则散落。

## 16. 一句话结论

这套体系的核心不是“给 AGENT 增加更多手续”，而是：

> 把传统技术研发中的方案评审、计划、开发、测试、评审、监督，收敛成一条全 AGENT 通用、强制执行、可自动校验的标准生命周期。

## 17. 后续实施产物建议

建议本设计后续落地的实施产物包括：

- `AGENT协作工具/docs/agent-standard-dev-lifecycle-implementation-plan.md`
- `AGENT协作工具/SKILLS/agent-standard-dev-lifecycle/`
- `AGENT协作工具/SKILLS/agent-design-review/`
- `AGENT协作工具/SKILLS/agent-dev-execution/`
- `AGENT协作工具/SKILLS/agent-quality-test/`
- `AGENT协作工具/SKILLS/agent-collab-supervisor/`
- `AGENT协作工具/templates/`
- `AGENT协作工具/github-actions/`
