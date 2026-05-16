# 7-ARTIFACT-HUB-V2 治理中枢化设计

> 仓库：`/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1`  
> 版本：v1（Governance Central Design）  
> 日期：2026-05-16  
> 状态：草案  
> 目标：把 `7-ARTIFACT-HUB-V2` 从“产物中台 + 路由服务”升级为“公司治理架构驱动的 AI 中枢”。

## 0. 设计背景

当前 `7-ARTIFACT-HUB-V2` 已经具备以下基础能力：

- 以 `dreambuddy/artifacts` 为产物真相源。
- 以 `dreambuddy/meta/artifact_hub.sqlite` 为元数据库。
- 通过 `tasks/` 与 `results/` 目录对接生产端。
- 提供 `route/decide`、`route/execute`、`traces/:traceId`、`events/stream` 等路由与追踪能力。
- 已落地独立 `ops-ui`，用于健康检查、路由测试、策略库与统计聚合。

但当前文档和架构表达仍偏向“服务设计视角”，还没有把它正式定义为：

- 以公司治理架构为核心组织方式；
- 同时服务内部研究中台与市场化中台；
- 保留现有 `/feed`、`/chain` 基础能力；
- 支持两套交易工作流并行展示与治理；
- 支持六部门协同、六人董事会（治理委员会）监督与人工审批；
- 解决 AI 的决策黑箱、执行黑箱、分发黑箱、审计黑箱。

本设计文档用于补齐这部分顶层设计。

## 1. 核心定位

### 1.1 从产物中台升级为公司中枢

`7-ARTIFACT-HUB-V2` 不再只被定义为：

- 产物管理中心；
- 路由与编排服务；
- 运维控制台后端。

它应被正式定义为：

> 一个由公司治理架构驱动的 AI 中枢系统。

这个中枢系统的作用是：

- 组织内容、策略、任务、路由和执行结果；
- 显式承载公司部门、角色、职责、治理规则和审批链；
- 将 AI 的判断、执行、分发、审计纳入统一治理框架；
- 随着大模型成熟，从“辅助治理”逐步演进为“可自主运行的公司中枢”。

### 1.2 总体目标

这套系统的总体目标不是“把产物放整齐”，而是：

- 让 AI 做出的关键决策可解释；
- 让 AI 执行过的关键动作可追踪；
- 让 AI 做出的内容分发可控制；
- 让整条链路可审计、可回放、可问责；
- 让系统内部存在持续优化和自我进化的动力。

## 2. 四类黑箱治理目标

### 2.1 决策黑箱

系统必须回答：

- AI 为什么这样判断；
- AI 为什么这样推荐；
- AI 为什么这样路由；
- AI 依据了哪些产物、规则、策略和上下文。

### 2.2 执行黑箱

系统必须回答：

- AI 实际调用了哪些链路、节点、技能与任务；
- 任务文件写到了哪里；
- 结果文件回收到了哪里；
- 哪些阶段成功、失败、超时或被拒绝。

### 2.3 分发黑箱

系统必须回答：

- 哪些内容被推送给了哪些人；
- 为什么命中了这个分层；
- 走了什么投放路径；
- 哪条分发策略在起作用。

### 2.4 审计黑箱

系统必须回答：

- 事后如何完整回放整条链路；
- 如何复盘决策和执行过程；
- 如何保留证据与责任边界；
- 如何让重大事项进入人工审批与追责流程。

## 3. 公司治理架构建模

### 3.1 第一版部门模型

第一版按部门优先建模，共 6 个核心部门：

- `研究部`
- `交易部`
- `治理部`
- `运营部`
- `HR`
- `市场部`

### 3.2 各部门职责

#### 研究部

- 负责内容研究中台；
- 负责研究产物、知识沉淀、策略前置分析；
- 为交易部、运营部、治理部提供研究依据。

#### 交易部

- 负责交易闭环执行；
- 负责 `/chain` 链路监控；
- 负责保留现有交易工作流；
- 负责新增基于 `6-TRADING` 的第二套交易工作流；
- 对盈亏表现、异常链路和执行稳定性负责。

#### 治理部

- 负责 AI 黑箱治理；
- 负责决策解释、执行追踪、风险控制、审计回放；
- 负责路由规则、门禁、审批与回滚策略。

#### 运营部

- 负责市场化中台；
- 负责内容路由、用户分层、推送分发、投放管理；
- 负责 TG、Twitter 等渠道运营与用户引导。

#### HR

- 负责绩效评估、人力招聘、部门优化；
- 负责对交易系统盈亏、运营资源消耗与营收做绩效评估；
- 负责发现部门低效、提出组织优化建议。

#### 市场部

- 负责外部竞争情报与市场调研；
- 负责关注 GitHub 同赛道热门项目、热门交易策略、热门 KOL、热门币种；
- 把外部机会与威胁输入研究部、交易部与运营部；
- 形成系统自我进化的外部驱动。

### 3.3 六人董事会（治理委员会）

在 6 部门之外，增加一层由 Agent 担任的监督治理层：

- 研究部长 Agent
- 交易部长 Agent
- 治理部长 Agent
- 运营部长 Agent
- HR 部长 Agent
- 市场部长 Agent

这 6 位部长 Agent 组成“六人董事会（治理委员会）”。

其职责是：

- 监督部门目标完成情况；
- 处理小问题；
- 协调跨部门问题；
- 形成中问题的联合建议；
- 将重大事项上报人工审批。

### 3.4 人工审批机制

当前阶段，系统不追求完全自治。

治理分级如下：

- `L1 小问题`
  - 部长 Agent 可直接处置；
- `L2 中问题`
  - 董事会讨论并形成联合建议；
- `L3 重大事项`
  - 必须上报人工审批，不得自动执行最终动作。

这意味着系统当前定位是：

> AI 辅助治理 + 人工最终决策。

随着模型成熟，后续再逐步提高自动决策阈值。

## 4. 双中台结构

### 4.1 内部研究中台

内部研究中台以现有 `http://localhost:3456/feed` 为基线。

必须保留旧中台的核心价值：

- 产物治理；
- 内容组织；
- Feed/详情页心智；
- 研究沉淀与内容解释；
- 研究链路追踪能力。

研究中台重点解决：

- 研究内容如何生成；
- 研究结论如何沉淀；
- 研究依据如何解释；
- 研究产物如何追溯到 trace 与 decision。

### 4.2 市场化中台

市场化中台第一阶段面向内部销售/运营团队。

第一阶段重点不是对外客户平台，而是内部运营分发平台。

重点能力包括：

- 内容池；
- 用户分层；
- 内容路由；
- 推送分发；
- 投放管理；
- 效果反馈；
- 分发审计。

市场化中台重点解决：

- 分发黑箱；
- 用户触达链路不透明；
- 哪些内容为什么推给哪些人；
- 渠道、节奏、投放结果如何回溯。

### 4.3 双中台的关系

双中台不是两套独立系统，而是：

- 同仓双入口；
- 一套代码；
- 一套底层能力；
- 两个页面入口；
- 两个业务视角。

共享底层包括：

- `dreambuddy/artifacts`
- `dreambuddy/meta`
- `dreambuddy/config`
- Route / Trace / Event / Task / Result / Archive / Registry

## 5. /chain 双交易工作流

### 5.1 保留现有工作流

`http://localhost:3456/chain` 是交易闭环链路监控页，必须保留。

它不是普通辅助页，而是：

- 交易部主视角；
- 交易闭环核心监控页；
- AI 执行黑箱治理的重要入口；
- 前端可视化工作流检测页。

必须保留的内容包括：

- 现有交易闭环链路；
- 现有前端工作流可视化；
- 现有链路畅通性检测逻辑；
- 现有 `chain_phase = A0-A9` 兼容层。

### 5.2 新增第二套交易工作流

在保留现有工作流的基础上，新增基于 `6-TRADING` 的第二套交易工作流。

第二套工作流的设计原则：

- 不破坏现有 `A0-A9` 链路兼容层；
- 显式引入 `workflow_id / workflow_type` 维度；
- 支持前端可视化并列展示；
- 让 `/chain` 能同时检查两套工作流是否畅通。

### 5.3 /chain 的目标形态

`/chain` 最终应展示：

- 现有交易工作流状态；
- 第二套交易工作流状态；
- 节点级健康度；
- trace / task / result / route 状态；
- 盈亏与风险信号；
- 审计入口与问题定位入口。

## 6. 治理对象模型

这套系统统一围绕以下治理对象建模：

- `Department`
- `Intent`
- `Decision`
- `Execution`
- `Artifact`
- `Distribution`
- `Audit`
- `Performance`
- `MarketIntel`
- `BoardProposal`
- `ApprovalGate`

### 6.1 Department

表示部门、部门职责与归属。

关键字段示例：

- `department_id`
- `name`
- `owner_agent`
- `responsibility_scope`
- `kpi_definition`

### 6.2 Intent

表示输入目标。

关键字段示例：

- `intent_id`
- `source`
- `actor`
- `payload`
- `constraints`
- `priority`

### 6.3 Decision

表示 AI 决策与路由解释。

关键字段示例：

- `decision_id`
- `trace_id`
- `policy_version`
- `reason`
- `selected_route`
- `evidence_refs`

### 6.4 Execution

表示实际执行链路。

关键字段示例：

- `execution_id`
- `trace_id`
- `workflow_id`
- `workflow_type`
- `nodes`
- `tasks`
- `results`
- `status`

### 6.5 Artifact

表示研究产物、策略产物、运营产物、审计产物。

关键字段示例：

- `artifact_id`
- `department`
- `category`
- `type`
- `chain_phase`
- `workflow_id`
- `trace_id`
- `status`

### 6.6 Distribution

表示分发与投放动作。

关键字段示例：

- `distribution_id`
- `artifact_id`
- `target_segment`
- `channel`
- `delivery_policy`
- `result`

### 6.7 Audit

表示审计与回放对象。

关键字段示例：

- `trace_id`
- `events`
- `decision_snapshot`
- `execution_snapshot`
- `distribution_snapshot`
- `review_notes`

### 6.8 Performance

表示绩效与部门健康。

关键字段示例：

- `performance_id`
- `department`
- `period`
- `kpi_name`
- `value`
- `status`

### 6.9 MarketIntel

表示外部市场与竞争情报。

关键字段示例：

- `intel_id`
- `source_type`
- `topic`
- `symbol`
- `priority`
- `forward_to_department`

### 6.10 BoardProposal

表示部长 Agent 或董事会提交的治理议案。

关键字段示例：

- `proposal_id`
- `source_department`
- `initiator_agent`
- `decision_level`
- `problem_summary`
- `recommended_action`
- `rollback_plan`
- `approval_status`

## 7. 页面结构

系统页面入口最终应提升为“公司中枢”结构：

- 公司中枢首页
- 研究中台
- 交易链路监控 `/chain`
- 治理控制台 `/ops`
- 市场化中台
- HR 绩效与组织优化台
- 市场情报与外部竞争台
- 董事会总览台

### 7.1 公司中枢首页

用于总览：

- 六部门健康度；
- 两套交易工作流状态；
- AI 黑箱治理总览；
- 董事会议案区；
- 人工审批待办区；
- 系统进化信号区。

### 7.2 董事会总览台

用于总览：

- 六部门状态；
- 跨部门问题；
- 已自主处理事项；
- 待会签中问题；
- 待人工审批重大事项。

## 8. 数据与契约

### 8.1 单一数据底座

正式将以下目录定义为单一真相源：

- `dreambuddy/artifacts`
- `dreambuddy/meta`
- `dreambuddy/config`

不再继续扩散旧 `~/.workbuddy` 路径心智。

### 8.2 统一元数据要求

后续所有产物、任务、结果、治理对象，应逐步统一到以下关键字段：

- `trace_id`
- `workflow_id`
- `workflow_type`
- `department`
- `chain_phase`
- `status`
- `schema_version`
- `policy_version`
- `producer`
- `timestamp`

### 8.3 Fail-Closed 原则

对以下关键治理链路，应采用 fail-closed：

- 敏感路由；
- 高风险交易执行；
- 面向外部分发；
- 审批未通过的重大事项；
- 证据缺失或 trace 不完整的关键动作。

## 9. 与现有文档的关系

本设计文档不是替代以下文档，而是作为它们的上位统一设计：

- `7-ARTIFACT-HUB-V2/README.md`
- `docs/superpowers/specs/2026-05-15-artifact-hub-v2-ops-console-design.md`
- `1-ARCHITECTURE/README.md`
- `1-ARCHITECTURE/中台设计/PRODUCT_HUB.md`
- `1-ARCHITECTURE/中台设计/PRODUCT_HUB_FULL.md`

各文档后续应分别对齐：

- `README`：运行与定位摘要；
- `Ops Console`：治理控制台专篇；
- `1-ARCHITECTURE`：总架构入口；
- `中台设计`：从“产物中台”升级为“公司中枢”设计。

## 10. 下一步文档化任务

### 必须补齐

- 更新 `7-ARTIFACT-HUB-V2/README.md`
- 更新 `1-ARCHITECTURE/README.md`
- 更新 `1-ARCHITECTURE/中台设计/README.md`
- 新增公司中枢架构设计文档

### 建议补齐

- `7-ARTIFACT-HUB-V2/GOVERNANCE_SPEC.md`
- `7-ARTIFACT-HUB-V2/OBJECT_MODEL.md`
- `7-ARTIFACT-HUB-V2/OPS_UI_README.md`
- `/chain` 双交易工作流设计文档

## 11. 一句话总结

`7-ARTIFACT-HUB-V2` 的下一阶段，不是把产物中台再做大一点，而是把它正式提升为：

> 由公司治理架构驱动、以六部门和六人董事会为组织心智、以双中台与双交易工作流为前台形态、以 AI 黑箱治理为核心目标的公司中枢系统。
