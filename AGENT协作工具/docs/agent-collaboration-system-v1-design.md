# AGENT协作系统 v1 设计

> 仓库：`dreambuddy-v1`  
> 版本：v1 草案  
> 日期：2026-05-17  
> 状态：draft  
> 目标：将现有 `AGENT协作工具` 从“规则集合”升级为“可执行、可裁决、可记账、可奖励”的 GitHub 原生协作系统。

## 0. 文档元信息

本文档面向以下读者：

- 负责任务拆解、编排、归档与知识沉淀的 `governance agent`
- 执行任务实现与交付的 `developer agent`
- 负责验收与裁决的 `validator agent`
- 负责确认顶层目标与治理约束、但不承担代码级验收的用户

补充说明：

- 协作工程实践中，建议将“账本协议维护”与“合并/冲突治理”拆分为两个独立职责，以避免互相干扰
- 拆分短规范见：`AGENT协作工具/docs/agent-ledger-protocol-vs-governance-short-spec.md`

一句话定义如下：

> `AGENT协作系统 v1` 是一套基于 GitHub 原生账本、声明裁决、可验证交付证明、验证评分与治理积分的多 AGENT 协作系统。

## 1. 背景与问题定义

当前仓库已经具备一套成熟的协作底座：

- 有 `dual-agent-conflict-gate` 负责开工前边界与冲突预防；
- 有 `STARTED / UPDATED / BLOCKED / DONE`、`DESIGN_REVIEW`、`TEST_REPORT` 等结构化评论；
- 有 `agent-standard-dev-lifecycle` 负责阶段化推进；
- 有 GitHub Actions checker 负责自动校验生命周期缺失项；
- 已新增“默认并行 + 白名单接管 + 关键节点强同步”的高效协作策略。

这些规则解决了“如何避免无序协作”的问题，但仍然没有把协作过程升级成一个完整的治理系统。当前主要缺口如下：

- 缺少全局唯一的协作账本，任务状态分散在任务板、评论、提交与人工记忆中；
- 缺少统一的任务声明裁决机制，重复开工与抢占冲突只能依赖人工判断；
- 缺少正式的交付证明模型，`DONE` 评论仍偏向“结果广播”，不是“可验证记账单元”；
- 缺少面向系统进化的奖励机制，容易出现“低质量刷工作量”而不是“高质量交付”；
- 缺少验证者主导的正式记账机制，导致“评审通过”与“正式入账”之间没有硬边界；
- 缺少“账本空闲期”的正式探索机制，导致 AGENT 发现高价值修补项时没有规范入口。

从更长远的视角看，后续产物枢纽与治理执行系统本质上也是一个多参与者协作、声明、裁决、验收与归档的过程。因此需要先把开发协作本身升级为一个治理系统，再把这套机制迁移到业务治理场景。

## 2. 设计目标

本设计的目标不是重做一条真正的公链，而是在 GitHub 原生环境中建立一套具有“分布式账本思维”的协作系统。

核心目标如下：

- 建立全局唯一的协作账本，作为任务、声明、交付、验证与奖励的真源；
- 让 AGENT 在开工前必须先声明、声明后才允许占用工作目录与进入执行态；
- 把“工作量证明”升级为“可验证交付证明”，防止低质量、重复、伪交付进入系统；
- 建立验证者 AGENT 的正式职责：评分、裁决、记账、奖励结算；
- 建立账本空闲期的“探索与专属任务”机制，使 AGENT 能提出高价值修补项并在授权后独占执行；
- 将“默认并行 + 关键点同步”与账本系统打通，使高效协作真正可执行；
- 保持与现有 `AGENT协作工具`、评论协议、任务卡、门禁和 checker 兼容；
- 让用户只承担目标确认与治理约束职责，不承担代码级验证职责。

成功标准如下：

- 任意任务都可以在账本中被唯一识别、声明、追踪、验收与归档；
- 任意重复声明、越权开工或低质量交付都能被裁决并阻止正式记账；
- 任意被接受的交付都必须带有可验证交付证明头；
- 验证者可以基于评分机制决定 `accepted / rework / block`；
- 奖励不再只看“做了多少”，而看“是否通过验证并为系统留下优质交付”。

## 3. 非目标与边界

`v1` 明确不做以下事项：

- 不构建独立数据库或单独账本服务；
- 不构建真正的公链式共识网络；
- 不设计复杂的代币经济模型；
- 不覆盖跨仓库协作；
- 不覆盖生产发布审批与企业级变更管理平台；
- 不解决所有自动调度优化问题。

`v1` 的边界是：

- 以单仓库内的 GitHub 原生对象为基础；
- 以任务账本、评论、分支、工作目录和 GitHub Actions 为主要介质；
- 以开发协作治理为第一落地场景；
- 为后续产物治理系统提供规则原型，而不是直接实现业务治理平台。

## 4. 设计原则

### 4.1 GitHub 原生优先

`v1` 以 GitHub 作为主要执行环境和审计载体。账本文件、PR 评论、GitHub Actions、分支和工作目录共同构成系统。

### 4.2 单一账本真源

所有任务、声明、交付、验证和奖励状态，必须以账本文件为最终真源。评论和提交只是输入证据，不是最终状态来源。

### 4.3 先声明后执行

AGENT 必须先检查账本和评论，再发布声明，再创建工作目录，再进入执行。未声明开工视为硬违规。

### 4.4 先过硬门槛，再做质量评分

系统首先阻止越权、重复、伪证据和无测试交付；只有通过硬门槛的交付，才进入评分与奖励阶段。

### 4.5 默认并行、关键同步

只要任务边界清晰、目录 owner 明确、未触碰共享边界与冻结契约，就默认允许并行推进。只有在共享边界、冻结契约、owner 边界、主分支合并等关键节点进入强同步。

### 4.6 奖励服务于质量进化

治理积分用于鼓励更优交付，而不是鼓励刷工作量。系统应逐步偏好最小改动、功能完整、简洁易维护、低风险的实现。

### 4.7 先授权探索，再授予专属执行权

当账本没有可执行任务时，执行者可以提出探索性任务，但不得先做后报。只有在验证者确认其必要性和价值后，探索项才转为正式任务，并授予限时专属执行权。

## 5. 核心概念模型

本系统的核心概念如下：

- `协作账本`：全局唯一的任务、交付、验证与奖励索引
- `任务项`：账本中的最小治理单元
- `工作声明`：AGENT 对任务占用权的结构化声明
- `工作目录`：执行任务的目录锚点，用于支撑裁决
- `探索提案`：账本空闲期由执行者提出、待验证者审查的候选任务
- `专属任务`：经验证者授权、在限定时间内由特定 AGENT 优先执行的任务
- `交付块`：一次阶段性交付单元
- `交付证明头`：交付块的结构化可验证摘要
- `验证记录`：验证者对交付块的验收与评分结果
- `治理积分`：系统对有效贡献的结算结果

术语映射如下：

- “分布式账本”在本系统中对应“协作账本”
- “区块”在本系统中对应“交付块”
- “区块头”在本系统中对应“交付证明头”
- “工作量证明”在本系统中被替换为“可验证交付证明”
- “矿工”在本系统中对应“开发 AGENT”
- “验证者”在本系统中对应“验收者 AGENT”

## 6. 参与角色与职责分工

### 6.1 强治理三角色模型

`AGENT协作系统 v1` 采用“组织上强治理、机制上强约束”的三角色模型：

- `治理 AGENT` 负责把用户目标翻译为可执行、可追踪、可收口的任务系统
- `开发 AGENT` 负责在授权边界内完成实现、测试与交付
- `验证者 AGENT` 负责技术验收、风险裁决、质量评分与正式接收结论

该模型的核心不是放大某个单一角色的自由裁量，而是形成稳定的控制面、执行面与裁决面分工，同时由账本、结构化评论、门禁规则、checker 与 GitHub Actions 共同约束三类角色。

### 6.2 governance agent

负责：

- 接收顶层目标并建立 `goal`
- 将目标拆解为任务树、里程碑与实施清单
- 定义任务优先级、依赖关系与释放条件
- 为任务标注 `parallel / serial / shared-sync`
- 维护任务账本、父子任务关系与状态一致性
- 在技术验收通过后完成归档、工程索引更新与 FAQ 沉淀
- 回写父任务与里程碑状态，推动系统级收口

不负责：

- 对代码交付做最终技术验收
- 绕过验证结论直接宣布任务技术完成
- 代替开发 AGENT 承担主体实现工作

### 6.3 developer agent

负责：

- 查看账本中的 `ready` 任务
- 在没有可执行任务时提交探索提案
- 发起工作声明并通过开工前门禁
- 创建工作目录
- 完成交付并提交交付证明头
- 响应 `rework` 要求继续迭代

不负责：

- 对自己当前交付做最终验收
- 单方面决定正式记账成功
- 绕过账本直接定义任务状态
- 重新编排全局任务树与优先级

### 6.4 validator agent

负责：

- 检查声明是否合法
- 审核探索提案的必要性、价值、范围与优先级
- 审核共享同步任务与高风险任务的同步点决策
- 检查交付证据是否完整
- 进行质量评分与结论裁决
- 产出 `accepted / rework / block` 结果
- 维护代码级验收结论，代替用户承担技术验证职责

不负责：

- 代替开发 AGENT 完成主要实现
- 主导全局任务树设计与优先级排程
- 在未经授权的情况下直接改写当前任务代码

### 6.5 用户职责边界

用户只负责：

- 确认顶层目标与治理边界
- 批准高层设计
- 决定是否接受系统性方向变更

用户不负责：

- 逐项阅读代码并给出技术验收结论
- 对交付块进行代码级打分
- 维护账本中的验证结论

### 6.6 权责边界

系统采用四层权力结构：

- `治理 AGENT` 决定任务秩序
- `开发 AGENT` 决定实现路径
- `验证者 AGENT` 决定技术结论
- `系统规则` 决定流程红线

其中：

- `治理 AGENT` 独占目标拆解、任务树维护、优先级排序、里程碑规划、任务入账、归档、工程索引更新与 FAQ 更新
- `验证者 AGENT` 独占技术验收、hard gate、质量评分与技术结论
- `开发 AGENT` 独占具体实现路径、局部代码组织、测试执行与交付提交
- 探索提案转正式任务、并串行分类复核、共享同步收口、范围升级重排、任务关闭前确认等动作，必须由 `治理 AGENT` 与 `验证者 AGENT` 联动完成
- claim 合法性检查、共享边界冲突检测、依赖门槛判定、状态流转校验、奖励计算、缺失证据阻断等动作，只能由系统自动完成，不能由任何单一角色口头放行

## 7. 系统对象与数据模型

`v1` 的最小对象集合如下：

- `task`
- `claim`
- `exploration_proposal`
- `workspace_anchor`
- `delivery_block`
- `validation_record`
- `reward_record`
- `governance_closure`

各对象最小关注点如下：

- `task`
  - 目标 ID、任务 ID、来源类型、状态、owner、验证者、父任务、依赖关系
- `claim`
  - 声明评论链接、声明时间、声明人、占用范围、执行模式
- `exploration_proposal`
  - 提案人、必要性、价值、范围、风险、审核结果、专属授权截止时间
- `workspace_anchor`
  - 工作目录路径、分支、创建时间、锚点任务 ID
- `delivery_block`
  - 交付证明头、父指针、提交号、摘要哈希
- `validation_record`
  - 结论、硬门槛结果、评分、问题清单
- `reward_record`
  - 奖励类型、基础奖励、质量系数、结算结果
- `governance_closure`
  - 归档摘要、索引更新、FAQ 决策、后续任务与收口完成时间

## 8. 账本设计

账本建议采用两层结构：

### 8.1 总账本

作用：

- 提供所有任务的当前状态索引；
- 便于 Action、治理 AGENT、开发 AGENT 与验证者 AGENT 快速读取；
- 避免把全部历史塞进一个文件。

建议字段：

- `goal_id`
- `task_id`
- `parent_task_id`
- `title`
- `source_type`
- `task_type`
- `mode`
- `status`
- `depends_on`
- `dependency_gate`
- `shared_boundary`
- `sync_checkpoint`
- `current_sync_state`
- `owner_agent`
- `validator_agent`
- `branch`
- `workspace_path`
- `claim_pointer`
- `delivery_pointer`
- `validation_pointer`
- `score`
- `reward`
- `final_credit_agent`
- `exclusive_owner_agent`
- `exclusive_until`
- `archived_at`
- `knowledge_synced_at`
- `next_required_action`

### 8.2 任务明细账本

作用：

- 保存完整历史；
- 记录声明链、交付链、验证链与奖励链；
- 作为最终审计记录。

建议结构：

- 任务基础信息
- 探索提案历史
- 声明历史
- 工作目录锚点历史
- 交付块历史
- 验证记录历史
- 积分结算历史
- 治理收口历史

### 8.3 指针关系

每个交付块应至少包含：

- 当前任务指针
- 父交付块指针
- 当前声明指针
- 当前提交指针

这样即使没有真正的链式密码学结构，也能建立稳定的可追溯交付序列。

## 9. 任务类型与执行模式

### 9.1 任务类型

- `parallel`
  - 允许多个 AGENT 在不同子任务上并行推进
- `serial`
  - 存在明确前置依赖，必须等待上游达到指定门槛
- `shared-sync`
  - 平时可按阶段并行推进，但在共享边界、冻结契约或关键收口点必须强同步

### 9.1.1 任务来源类型

- `assigned`
  - 来自现有规划、任务板或用户直接指定
- `derived`
  - 来自父任务拆分或并行子任务派生
- `exploratory`
  - 来自账本空闲期的探索提案，经验证者批准后入账

### 9.2 执行模式

- `PHASE_BROADCAST`
  - 默认模式，按阶段广播，不按微提交广播
- `DIRECT_TAKEOVER`
  - 白名单直接接管模式
- `STRONG_SYNC`
  - 共享边界、契约、closeout 等关键节点强同步

### 9.3 区别

任务类型决定“可否并行”，执行模式决定“如何协作”。

例如：

- 一个 `parallel` 任务可以以 `PHASE_BROADCAST` 方式推进；
- 一个 `shared-sync` 任务在命中同步点后必须切到 `STRONG_SYNC`；
- 一个局部小修复任务可以在授权下从 `parallel` 切到 `DIRECT_TAKEOVER`。

### 9.4 编排附加字段

为支撑强治理编排，任务模型建议至少增加以下字段：

- `depends_on`
- `dependency_gate`
- `shared_boundary`
- `sync_checkpoint`
- `current_sync_state`

其中：

- `dependency_gate` 建议取值为 `planned | accepted | ledgered`
- `current_sync_state` 建议取值为 `none | pending | in_review | cleared`

## 10. 声明与占用协议

### 10.1 有效声明的条件

一条工作声明同时满足以下条件时，才视为有效：

- 对应任务当前允许被声明；
- 评论格式满足结构化模板；
- 声明任务、分支、占用范围、执行模式、下一同步点明确；
- 未与已有有效声明冲突；
- 若需要工作目录锚点，则工作目录创建成功；
- GitHub Action 裁决通过。

### 10.2 开工前顺序

执行者必须按以下顺序行动：

1. 读取账本
2. 检查已有声明或可并行任务
3. 若无可执行任务，则提交探索提案并等待验证者审核
4. 发布新声明
5. 创建工作目录锚点
6. 等待 Action 裁决
7. 裁决通过后进入执行

### 10.3 占用规则

- `serial`：只允许一个有效声明
- `parallel`：允许多个有效声明，但必须绑定不同子任务或不同工作目录
- `shared-sync`：声明只是预约，不代表直接开工，必须等待强同步确认

### 10.4 无效声明

以下情况视为无效：

- 重复声明同一串行任务；
- 未按模板提供必要字段；
- 声明后未建立工作目录锚点；
- 已被 Action 裁决为败诉声明。

### 10.5 探索提案与专属任务

当账本中没有现成可执行任务，或系统显式允许探索时，执行者可提交探索提案。

探索提案必须至少包含：

- 拟修补问题
- 必要性说明
- 价值说明
- 范围边界
- 风险与共享边界判断
- 预期交付物

验证者审核通过后：

- 将该提案写入账本；
- 将其转为 `exploratory` 来源任务；
- 授予提案者限时专属执行权；
- 超时未开工则专属权失效，任务重新回到账本池。

## 11. 冲突裁决机制

### 11.1 裁决输入

裁决不只看评论时间，而是综合以下输入：

- `claim comment created_at`
- `workspace anchor created_at`
- `action first seen timestamp`
- `task mode`
- `current ledger state`

### 11.2 裁决原则

- 串行任务优先保留首个有效声明；
- 并行任务优先检查子任务/工作目录是否冲突；
- 共享同步任务由验证者或系统显式放行后才进入执行；
- 同时声明时，评论时间只是候选输入，最终以系统裁决结果为准。

### 11.3 裁决输出

裁决结果建议统一为：

- `CLAIM_ACCEPTED`
- `CLAIM_REJECTED_DUPLICATE`
- `CLAIM_REJECTED_SCOPE_CONFLICT`
- `CLAIM_REQUIRES_STRONG_SYNC`
- `PROPOSAL_ACCEPTED_EXCLUSIVE_GRANT`
- `PROPOSAL_REJECTED_LOW_VALUE`

并把结果同步回：

- PR 评论
- 账本状态
- 工作目录状态

## 12. 工作目录与区块锚点机制

工作目录的作用不是替代分支，而是提供一个可被系统直接识别的“工作锚点”。

### 12.1 为什么需要工作目录锚点

- 评论可能因网络延迟乱序；
- 分支可以承载多个任务；
- 单靠提交难以准确表达“谁先合法占用该工作单元”。

### 12.2 工作目录的职责

- 绑定任务 ID；
- 绑定声明；
- 提供被 Action 识别的落地证据；
- 在裁决冲突时作为第二锚点。

### 12.3 工作目录规则

- 一个工作目录只能绑定一个任务；
- 一个串行任务同一时间只能有一个有效工作目录；
- 工作目录创建但无有效声明时，不得进入正式账本；
- 有声明但长期无工作目录时，可被系统回收。

## 13. 交付证明机制

### 13.1 原则

系统不再接受“只有 `DONE` 评论、没有正式交付证明”的完成方式。

任意要进入验证流程的交付，必须提交一个交付证明头。

### 13.2 交付证明头最小字段

- `task_id`
- `agent`
- `branch`
- `workspace_path`
- `parent_pointer`
- `claim_pointer`
- `commit_sha`
- `changed_files`
- `completed_items`
- `test_evidence`
- `scenario_evidence`
- `risk_notes`
- `delivery_hash`

### 13.3 delivery_hash

`v1` 不要求真正密码学链，只要求稳定可追溯摘要。

可采用以下输入生成摘要：

- `task_id`
- `commit_sha`
- `parent_pointer`
- `changed_files summary`

### 13.4 交付证明的目标

- 证明“做了什么”
- 证明“基于什么继续做”
- 证明“留下了哪些验证证据”
- 证明“当前风险是否已显式记录”

## 14. 验证与评分机制

### 14.1 硬门槛

以下任一命中，直接 `BLOCK`，不允许正式记账：

- 未声明开工
- 重复任务冲突后仍强行提交
- 越权修改共享边界或冻结契约
- 交付证据与实际代码不一致
- 缺少必要测试/验证证据
- 扩大 scope 但未补 `UPDATED`
- 提交伪测试、伪通过、伪验收材料
- 探索提案未经批准即直接开工

### 14.2 评分维度

总分 `100`，建议采用以下四维：

- `最小改动`：25
- `功能完善`：30
- `简洁易维护`：25
- `风险控制`：20

#### 最小改动

关注：

- 是否仅修改必要文件；
- 是否避免无关 scope 蔓延；
- 是否避免引入不必要重构。

#### 功能完善

关注：

- 是否完成任务要求；
- 是否覆盖关键路径与错误路径；
- 是否满足声明中的预期产物。

#### 简洁易维护

关注：

- 是否结构清晰；
- 是否易于接手；
- 是否避免堆砌与隐蔽复杂度。

#### 风险控制

关注：

- 是否引入共享边界风险；
- 是否引入隐性耦合；
- 是否保持证据与实现一致；
- 是否留下清晰风险说明。

### 14.3 评分结论

- `80-100`：`ACCEPTED`
- `60-79`：`REWORK`
- `<60`：`BLOCK`

### 14.4 结论含义

- `ACCEPTED`
  - 可正式记账，并进入下一阶段或关闭任务
- `REWORK`
  - 保留交付块历史，但不进入最终账本
- `BLOCK`
  - 视为无效交付，必须停下并修正基础问题

### 14.5 探索提案审核维度

验证者审核探索提案时，至少从以下维度判断：

- `必要性`
  - 是否真的是漏洞、缺口、漂移或稳定性隐患
- `价值`
  - 是否对主线推进、系统稳定性或治理能力有明显收益
- `范围可控`
  - 是否能以小范围独立收口，而不是借题扩散
- `不与主线冲突`
  - 是否不会打断更高优先级任务
- `可验证`
  - 是否能明确交付物与验收标准

只有通过上述审核的提案，才允许转成专属任务。

## 15. 奖励、积分与惩罚机制

### 15.1 基础原则

奖励不应只发给“最后交付者”，否则会压制前置铺垫工作与验证工作。

### 15.2 奖励类型

- `有效声明奖励`
- `探索发现奖励`
- `有效交付奖励`
- `最终收口奖励`
- `验证奖励`
- `专属交付奖励`

### 15.3 奖励公式

建议采用：

`最终奖励 = 基础奖励 × 质量系数`

其中质量系数来自评分区间：

- `90+`：高质量系数
- `80-89`：标准系数
- `60-79`：不进入最终奖励，只保留重做记录

### 15.4 惩罚项

- 无效重复声明
- 低质量探索提案
- 越权提交
- 伪测试或伪证据
- 评论与代码严重不一致
- 低质量刷任务

### 15.5 惩罚原则

惩罚不是为了“扣分好看”，而是为了降低系统接受低质量交付的概率，保护长期演化质量。

## 16. 状态机与生命周期流转

为确保任务从“目标进入系统”到“归档与知识沉淀完成”的全过程可执行、可校验、可审计，`v1` 建议采用以下主状态流：

- `goal_received`
- `decomposing`
- `planned`
- `ready`
- `claimed`
- `in_progress`
- `sync_pending`
- `sync_review`
- `delivered`
- `validating`
- `accepted`
- `rework_required`
- `blocked`
- `ledgered`
- `archived`
- `knowledge_synced`

标准成功路径如下：

```text
goal_received
-> decomposing
-> planned
-> ready
-> claimed
-> in_progress
-> delivered
-> validating
-> accepted
-> ledgered
-> archived
-> knowledge_synced
```

返工路径如下：

```text
delivered
-> validating
-> rework_required
-> delivered
-> validating
-> accepted
```

阻塞路径如下：

```text
ready / claimed / in_progress / validating
-> blocked
-> planned / ready / in_progress
```

共享同步路径如下：

```text
in_progress
-> sync_pending
-> sync_review
-> in_progress / blocked / delivered
```

### 16.1 状态定义

- `goal_received`
  - 用户目标已进入系统，等待治理 AGENT 建立正式任务图
- `decomposing`
  - 治理 AGENT 正在拆解任务树、依赖关系与里程碑
- `planned`
  - 任务已正式定义并入账，但尚未满足释放条件
- `ready`
  - 任务已经满足开工前置条件，允许被有效声明
- `claimed`
  - 已有有效声明，且正在建立或已建立工作目录锚点
- `in_progress`
  - 开发 AGENT 已进入实现阶段
- `sync_pending`
  - 共享同步任务已命中同步条件，不能继续单边推进
- `sync_review`
  - 治理 AGENT 与验证者 AGENT 正在执行同步点裁决
- `delivered`
  - 开发 AGENT 已提交交付、测试与交付证明头
- `validating`
  - 验证者 AGENT 正在执行技术验收与评分
- `accepted`
  - 技术验收通过，允许正式记账
- `rework_required`
  - 验证未通过但允许继续修正
- `blocked`
  - 任务因边界冲突、依赖未满足、验证阻断或重排需求而暂停推进
- `ledgered`
  - 账本、验证指针与奖励真源已正式写回
- `archived`
  - 任务已退出活动队列，形成稳定归档记录
- `knowledge_synced`
  - 工程索引、FAQ 评估与治理收口均已完成

### 16.2 状态推进权

- `goal_received -> ready` 由 `治理 AGENT` 主导
- `ready -> delivered` 由 `开发 AGENT` 主导，但必须通过系统门禁
- `delivered -> accepted / rework_required / blocked` 由 `验证者 AGENT` 主导
- `accepted -> ledgered` 由系统或治理写回逻辑按规则执行
- `ledgered -> archived -> knowledge_synced` 由 `治理 AGENT` 主导

### 16.3 非法跳转硬规则

系统必须硬性阻止以下非法跳转：

- `ready -> in_progress`，因为必须先 claim
- `in_progress -> accepted`，因为不能跳过交付与验证
- `delivered -> archived`，因为不能跳过验收与正式记账
- `accepted -> knowledge_synced`，因为不能跳过记账与归档
- `blocked -> accepted`，因为阻塞解除后必须回归正常流程
- `rework_required -> accepted`，因为返工后必须重新交付并验证

### 16.4 与现有 Phase 0-8 的关系

账本状态机不替代生命周期阶段，而是嵌套在生命周期中：

- `Phase 0-2` 主要驱动 `goal_received -> decomposing -> planned`
- `Phase 3-4` 主要驱动 `planned -> ready -> claimed -> in_progress`
- `Phase 5-7` 主要驱动 `delivered -> validating -> accepted / rework_required / blocked`
- `Phase 8` 主要驱动 `accepted -> ledgered -> archived -> knowledge_synced`

## 17. GitHub 原生落地架构

`v1` 采用 GitHub 原生轻量版落地：

- 仓库文件承担账本真源；
- PR 评论承担声明、交付与验证广播；
- GitHub Actions 承担裁决与自动检查；
- 分支与工作目录承担执行锚点。

### 17.1 主要载体

- `AGENT协作工具/` 下的规则文档与模板
- 仓库内账本文件
- GitHub PR 评论
- GitHub Actions Workflow

### 17.2 优点

- 落地快；
- 审计链天然存在；
- 易于与现有生命周期和 checker 兼容；
- 不引入额外运维基础设施。

## 18. GitHub Actions 裁决与自动化任务

### 18.1 Action 职责

- 校验声明是否合法；
- 检查任务是否重复占用；
- 判断是否需要强同步；
- 读取账本、评论与工作目录状态；
- 聚合评分输入；
- 更新账本一致性状态。

### 18.2 自动化任务类型

- `声明裁决任务`
- `探索提案扫描与授权任务`
- `待验收扫描任务`
- `奖励更新任务`
- `任务超时/僵尸声明清理任务`
- `治理收口检查任务`

### 18.3 边界

Action 负责执行规则，不负责定义规则本身。规则真源仍是仓库文档与账本协议。

### 18.4 最小闭环的目标与边界

在 `治理 AGENT` 已具备字段、模板与状态机约束的前提下，`v1` 下一阶段的核心不是继续增加协议字段，而是建立“治理协议的首个可运行执行闭环”。

该最小闭环的目标是：

- 自动从 PR body 与结构化评论提取治理信号
- 自动判断当前状态推进是否合法
- 自动把任务状态写回 `tasks/index.json`
- 自动把奖励记录写回 `rewards/index.json`
- 自动推进 `accepted -> ledgered -> archived -> knowledge_synced`
- 在治理收口数据不完整时阻断 `knowledge_synced`

该最小闭环明确不做：

- 自动任务拆解
- 自动排程
- 自动释放下游任务
- 自动探索提案转正式任务
- 自动专属授权与超时回收
- 自动 FAQ 正文生成
- 仓库级主动扫描

因此，`v1` 最小闭环的本质不是“完整治理 AGENT 自动化”，而是“从验证通过到账本、奖励与治理收口完成为止的自动执行链”。

本轮采用的输入边界是 **GitHub 事件上下文模式**：

- workflow 将当前 PR body、结构化评论、账本路径与触发上下文输入给总控脚本
- 总控脚本只处理本次触发对应的单个任务上下文
- 总控脚本不主动扫描全仓，不承担调度职责

### 18.5 单脚本控制器与组件设计

为避免治理执行逻辑继续散落在多个 workflow 和小脚本中，`v1` 最小闭环采用“**单控制器 + 现有脚本做纯函数依赖**”的结构。

建议新增统一控制入口：

- `AGENT协作工具/github-actions/run_governance_ledger_cycle.py`

该脚本是最小闭环的唯一业务入口，负责一次完整治理执行周期的编排，但不负责承载全部细节规则。

#### 18.5.1 控制器职责

`run_governance_ledger_cycle.py` 负责：

- 读取 workflow 注入的事件上下文
- 加载当前任务账本与奖励账本
- 调用 payload builder 生成标准 payload
- 调用 checker 执行规则判定
- 在判定通过时调用 updater 执行状态推进与账本写回
- 输出结构化执行结果给 workflow 与后续巡检任务使用

`run_governance_ledger_cycle.py` 不负责：

- 自动任务拆解
- 自动排程
- 仓库级任务扫描
- 在脚本内部重复实现 builder/checker/updater 的细节逻辑

#### 18.5.2 纯函数依赖模块

现有脚本继续保留，但职责明确收敛：

- `build_agent_collaboration_payload.py`
  - 负责解析 PR body、评论与上下文字段，输出标准 payload
  - 不执行规则判断
  - 不写账本

- `check_agent_collaboration.py`
  - 负责对 payload 做合法性判断
  - 输出 `decision / reason_codes / recommended_next_action`
  - 不写账本

- `update_agent_ledger.py`
  - 负责执行状态推进、任务账本写回、奖励账本写回与 `governance_closure` 校验
  - 成为唯一账本写入口

workflow 层应尽量保持轻量，只负责：

- 准备 GitHub 事件上下文
- 触发 `run_governance_ledger_cycle.py`
- 根据返回结果决定成功、失败与日志保留

#### 18.5.3 面向 Trae 巡检型 AGENT 的预留接口

`v1` 后续允许通过 Trae 自动化任务配置“治理 AGENT / 验证者 AGENT”的**巡检型**角色，用于：

- 定时检查账本滞留状态
- 检查评论缺失或协议漂移
- 检查主干文档、手册与规则的同步性
- 检查 `accepted` 未记账、`archived` 未完成收口等异常
- 必要时补治理评论或给出建议

巡检型 AGENT **不直接写账本**。因此本轮最小闭环需要显式预留只读接口，控制器输出必须包含至少以下字段：

- `task_id`
- `decision`
- `reason_codes`
- `previous_status`
- `new_status`
- `reward_written`
- `knowledge_sync_written`
- `next_required_action`
- `updated_task_index`
- `updated_reward_index`

这样后续 Trae 巡检型 AGENT 可以低成本地消费控制器结果，而不必重新解析全部评论与账本上下文。

#### 18.5.4 Self-Hosted Runner 自动化模式（推荐用于 PR9）

当“定时自动化任务需要人工点运行/授权”导致链条卡死时，允许采用 GitHub Actions + self-hosted runner 的自动化模式：

- Actions 负责定时触发与审计链记录
- runner 跑在本机（macOS），可直接复用本机工具链执行 `7-ARTIFACT-HUB-V2` 的 build/test
- workflow 只做两件事：
  - 运行 build/test 并把结果写成结构化 PR 评论（STARTED / TEST_REPORT / VALIDATION_RESULT）
  - 由 `VALIDATION_RESULT`（且 `Governance Handoff: ledgered|archived|knowledge_synced`）触发既有 claim-guard 工作流推进账本与奖励

该模式的协议落脚点与最小闭环职责边界不变：

- workflow 不直接写 `tasks/index.json` / `rewards/index.json`
- 账本推进仍由 `run_governance_ledger_cycle.py` 统一裁决并写回

### 18.6 最小闭环的数据流与一次执行周期

一次最小闭环执行周期建议固定为以下 6 个阶段：

1. 收集上下文
2. 构造标准 payload
3. 执行规则判定
4. 读取当前账本状态
5. 执行合法状态推进与账本写回
6. 输出结构化执行结果

整体调用链如下：

```text
GitHub Event Context
-> run_governance_ledger_cycle.py
-> build_agent_collaboration_payload.py
-> check_agent_collaboration.py
-> update_agent_ledger.py
-> tasks/index.json + rewards/index.json
-> structured execution result
```

#### 18.6.1 推荐输入结构

builder 产出的标准 payload 至少应包含：

- `task_id`
- `branch`
- `governance_agent`
- `task_type`
- `dependency_gate`
- `current_sync_state`
- `validation_decision`
- `validation_score`
- `governance_handoff`
- `current_status`
- `requested_status`
- `delivery_present`
- `validation_present`
- `ledger_entry_present`
- `closure_ready`
- `dependency_satisfied`
- `sync_review_present`
- `next_required_action`

其中部分字段来自评论与 PR body，部分字段由控制器在读取当前账本状态后补齐。

#### 18.6.2 执行顺序

`run_governance_ledger_cycle.py` 的推荐执行顺序如下：

1. 读取 workflow 注入的原始事件上下文
2. 调用 `build_agent_collaboration_payload.py` 生成标准 payload
3. 调用 `check_agent_collaboration.py` 判断当前推进是否合法
4. 若 checker 返回 `BLOCK`，直接结束，不写账本
5. 若 checker 返回 `PASS`，调用 `update_agent_ledger.py` 读取账本并执行状态推进
6. 输出统一的 `cycle_result`

#### 18.6.3 最小自动推进范围

本轮控制器只自动处理以下三段推进：

- `accepted -> ledgered`
- `ledgered -> archived`
- `archived -> knowledge_synced`

其中：

- `accepted -> ledgered`
  - 需要合法 `VALIDATION_RESULT`
  - 需要 `Decision = ACCEPTED`
  - 需要满足奖励门槛
  - 允许写入奖励记录

- `ledgered -> archived`
  - 需要当前任务已正式记账
  - 需要具备最小归档基础数据

- `archived -> knowledge_synced`
  - 需要 `governance_closure` 至少具备：
    - `archive_summary`
    - `index_updates`
    - `faq_decision`
    - `closure_agent`

不在本轮自动化范围内的阶段包括：

- `goal_received -> decomposing`
- `decomposing -> planned`
- `planned -> ready`
- `ready -> claimed`
- `claimed -> in_progress`
- `in_progress -> delivered`
- `delivered -> validating`

这些阶段仍由人工协作与协议驱动。

#### 18.6.4 失败与阻断路径

一次执行周期中，出现以下任一情况都必须立刻停止，并返回明确 reason code：

- payload 解析失败
- 缺少 `task_id`
- checker 返回 `BLOCK`
- 当前任务在账本中不存在
- 状态跳转非法
- 奖励写回失败
- `knowledge_synced` 所需 closure 字段不完整

失败时不允许进行部分写回，也不允许 silent failure。推荐统一输出如下结构：

```json
{
  "task_id": "task-123",
  "decision": "BLOCK",
  "reason_codes": ["RULE_SYNC_REVIEW_REQUIRED"],
  "previous_status": "archived",
  "new_status": "archived",
  "reward_written": false,
  "knowledge_sync_written": false,
  "next_required_action": "governance: add sync review evidence"
}
```

该结构既是 workflow 的执行结果，也是未来 Trae 巡检型 `治理 AGENT / 验证者 AGENT` 的主要读取接口。

### 18.7 最小闭环的测试策略与失败恢复设计

最小闭环的测试目标不是验证“系统能否完成所有治理任务”，而是验证以下四点：

- 控制器能否稳定编排一次完整执行周期
- 账本写回是否确定、可重复、可审计
- 失败时系统是否能安全停住，而不是写出半残状态
- 输出结果是否足够结构化，便于未来 Trae 巡检型 AGENT 低成本消费

#### 18.7.1 测试分层

建议最小闭环至少采用以下四层测试：

- 纯函数单元测试
  - 验证 `build_agent_collaboration_payload.py`
  - 验证 `check_agent_collaboration.py`
  - 验证 `update_agent_ledger.py`

- 控制器集成测试
  - 验证 `run_governance_ledger_cycle.py` 能正确串联 builder、checker、updater
  - 验证一次输入上下文能得到完整的 `cycle_result`

- 文件写回测试
  - 在临时目录中验证 `tasks/index.json` 与 `rewards/index.json` 的写回行为
  - 确保只更新目标任务，不污染其他任务
  - 确保奖励记录采用追加而非覆盖

- workflow 级冒烟测试
  - 验证 GitHub workflow 调用的是总控脚本
  - 验证 workflow 不再在 YAML 中散落业务逻辑

#### 18.7.2 最小测试矩阵

最小闭环至少应覆盖以下测试用例：

- 成功记账
  - 输入：合法 `VALIDATION_RESULT`，当前任务状态为 `accepted`
  - 预期：推进到 `ledgered`，写入奖励记录

- 非法跳跃推进
  - 输入：`accepted` 任务直接请求 `knowledge_synced`
  - 预期：`BLOCK`，不写账本

- 归档成功
  - 输入：当前任务状态为 `ledgered`，且归档基础数据完整
  - 预期：推进到 `archived`，写入 `archived_at`

- 知识沉淀成功
  - 输入：当前任务状态为 `archived`，且 `governance_closure` 完整
  - 预期：推进到 `knowledge_synced`，写入 `knowledge_synced_at`

- 知识沉淀被阻断
  - 输入：当前任务状态为 `archived`，但缺少 `archive_summary` 或 `faq_decision`
  - 预期：`BLOCK`，不写账本，并输出明确 `next_required_action`

- checker 阻断时零副作用
  - 输入：shared-sync 任务缺少 `sync_review_present`
  - 预期：控制器返回 `BLOCK`，任务账本与奖励账本均保持不变

#### 18.7.3 幂等性要求

由于 GitHub workflow 可能重复触发，最小闭环必须具备幂等性：

- 对同一输入重复执行时，不应重复追加奖励
- 已经处于目标状态的任务，不应再次推进
- 已经写过 `knowledge_synced_at` 的任务，不应重复生成不同结果
- 重复执行应返回显式结果，而不是生成重复副作用

推荐策略是：

- 允许重复运行
- 但在检测到目标状态已达成时，返回 `PASS` 且 `state_changed = false`

#### 18.7.4 失败恢复设计

最小闭环必须遵守“失败时可重试，且不需要人工修账本”的原则。

失败类型建议分为两类：

- 写前失败
  - payload 解析失败
  - 缺少 `task_id`
  - checker 返回 `BLOCK`
  - 当前任务不存在
  - `knowledge_synced` 所需 closure 字段缺失
  - 处理方式：直接退出，不写账本，允许补齐输入后重跑

- 写中失败
  - 任务账本已更新但奖励账本未成功写入
  - 或奖励账本已更新但任务账本未成功写入
  - 处理目标：尽量避免出现该类半写状态

为降低半写失败风险，控制器应采用如下写回策略：

- 先读取原文件
- 在内存中构造完整的新任务账本与新奖励账本
- 完成全部校验后，再进入写盘阶段
- 优先使用临时文件 + 原子替换
- 任一校验失败时，不触碰磁盘

#### 18.7.5 面向巡检型 AGENT 的失败接口

失败结果必须对未来 Trae 巡检型 `治理 AGENT / 验证者 AGENT` 友好。控制器在失败时至少应输出：

- `decision`
- `reason_codes`
- `task_id`
- `previous_status`
- `new_status`
- `next_required_action`
- `repair_hint`

例如：

```json
{
  "task_id": "task-123",
  "decision": "BLOCK",
  "reason_codes": ["RULE_CLOSURE_DATA_INCOMPLETE"],
  "previous_status": "archived",
  "new_status": "archived",
  "next_required_action": "governance: provide archive_summary and faq_decision",
  "repair_hint": "add closure fields before retrying governance cycle"
}
```

这样巡检型 AGENT 可以直接基于结构化结果补治理评论、发建议或提示下一步动作，而不需要重新推理控制器为什么失败。

## 19. 与现有 AGENT协作工具 的映射关系

当前对象到新系统的映射如下：

- `agent-task-card` -> 任务明细账本的基础录入模板
- `STARTED` -> 工作声明广播
- `探索提案评论` -> 候选任务提案与专属授权输入
- `UPDATED` -> 声明修订或范围变更广播
- `DONE` -> 交付块广播，而不只是“做完了”
- `TEST_REPORT` -> 交付证明头的重要证据输入
- `DESIGN_REVIEW` -> 验证输入与质量判断依据
- `conflict_gate` -> 声明前技术门禁与裁决输入
- `checker / GitHub Actions` -> 生命周期与账本一致性校验层

系统升级的核心不是推翻原工具，而是让它们接入同一套账本协议。

## 20. v1 最小落地范围

`v1` 必做：

- 账本文件结构
- 任务声明协议
- 探索提案与专属任务协议
- 工作目录锚点规则
- 交付证明头格式
- 验证与评分规则
- GitHub Actions 裁决逻辑
- 基础积分结算逻辑

`v1` 不做：

- 独立服务
- 数据库
- 排行榜系统
- 跨仓库协作
- 复杂经济模型

## 21. 风险、防滥用与抗刷分设计

### 21.1 风险类型

- 刷声明占坑
- 刷探索提案
- 刷目录锚点
- 刷低质量小任务
- 伪测试或伪验收
- 文档证据漂移
- 最终摘桃子

### 21.2 防护策略

- 有效声明必须配合工作目录与 Action 裁决
- 探索提案必须先经验证者授权，不能自由开工
- 未通过硬门槛的交付不得入账
- 奖励按质量系数结算，不按改动量结算
- 最终奖励拆分，不只奖励最后交付者
- 验证者需要对“评论证据与代码不一致”显式打回

### 21.3 系统目标

系统应逐步对抗“女巫攻击”式低质量刷分行为，让奖励自然流向更优实现与更可靠验证。

## 22. 验收标准

设计完成的标准如下：

- 账本、声明、交付、验证、奖励五个核心环节均有正式定义；
- 各对象的最小字段与状态转换清楚；
- GitHub 原生落地边界明确；
- 与现有工具链的映射明确；
- 没有依赖模糊补充说明才能成立的关键占位项。

系统可执行的标准如下：

- 一条串行任务可完成完整声明、裁决、交付、验证、记账与治理收口流程；
- 一条并行任务可完成无冲突的多执行者推进；
- 一条共享同步任务可被正确拦截并进入 `sync_pending / sync_review` 后再继续收口；
- 一条探索提案可被验证者批准、转为专属任务并最终完成记账；
- 一条低质量交付能被评分系统判为 `REWORK` 或 `BLOCK`；
- 一条高质量交付能被正式记账、归档并完成知识沉淀。

## 23. 实施顺序与迁移计划

建议按以下顺序实施：

1. 先落正式设计文档
2. 再扩展任务卡与评论模板
3. 引入账本文件结构与探索提案入口
4. 扩展 GitHub Actions 裁决逻辑
5. 接入验证评分与奖励计算
6. 最后接入定时自动化角色

迁移原则如下：

- 先兼容现有生命周期与评论模板；
- 再引入新账本对象；
- 最后把旧“广播式协作”过渡到“账本驱动协作”，并将治理收口嵌入正式状态机。

## 24. 附录：字段草案与评论模板映射

### 24.1 任务账本字段草案

- `goal_id`
- `task_id`
- `parent_task_id`
- `title`
- `source_type`
- `task_type`
- `mode`
- `status`
- `depends_on`
- `dependency_gate`
- `shared_boundary`
- `sync_checkpoint`
- `current_sync_state`
- `owner_agent`
- `validator_agent`
- `branch`
- `workspace_path`
- `claim_pointer`
- `delivery_pointer`
- `validation_pointer`
- `score`
- `reward`
- `final_credit_agent`
- `exclusive_owner_agent`
- `exclusive_until`
- `archived_at`
- `knowledge_synced_at`
- `next_required_action`

### 24.2 声明评论建议字段

- `Agent`
- `Task`
- `Branch`
- `Execution Mode`
- `Workspace Path`
- `Claim Target`
- `Scope`
- `Next Sync Checkpoint`

### 24.3 探索提案评论建议字段

- `Agent`
- `Proposal Type`
- `Necessity`
- `Value`
- `Scope Boundaries`
- `Risk Notes`
- `Expected Deliverable`
- `Requested Exclusive Window`

### 24.4 交付评论建议字段

- `Task`
- `Commit`
- `Parent Pointer`
- `Changed Files`
- `Completed Items`

### 24.5 治理收口对象建议字段

- `archive_summary`
- `index_updates`
- `faq_decision`
- `faq_entries`
- `rollup_effect`
- `followup_tasks`
- `closure_agent`
- `closure_completed_at`
- `Test Evidence`
- `Scenario Evidence`
- `Risk Notes`
- `Delivery Hash`

### 24.5 验证评论建议字段

- `Validator`
- `Hard Gate Result`
- `Score`
- `Decision`
- `Reward Multiplier`
- `Ledger Update`

### 24.6 记账评论建议字段

- `Ledger Entry`
- `Accepted Delivery Pointer`
- `Reward Result`
- `Final Credit Agent`

## 25. 一句话结论

`AGENT协作系统 v1` 的核心不是把协作过程说得更复杂，而是把“先声明、后执行、提交证明、验证评分、正式记账”变成仓库内真正可执行、可审计、可进化的治理闭环。
