# 7-ARTIFACT-HUB-V2 治理对象模型

> 版本：v1.0  
> 更新日期：2026-05-16  
> 作用：统一 `7-ARTIFACT-HUB-V2` 的核心对象命名、字段语义和对象关系，作为双中台、双交易工作流、董事会与审计体系的共同语言。

## 1. 目标

当前系统已经有：

- ArtifactStore
- MetaStore
- RouterEngine
- WorkOrderManager
- EventBus
- Route / Trace / Event / Task / Result

但它们还主要是“工程模块对象”，还不是完整的“治理对象模型”。

本文件的目标是把系统统一到以下治理对象：

- `Department`
- `MinisterAgent`
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

## 2. 顶层对象关系

治理链路的理想关系如下：

```text
Department -> MinisterAgent
Intent -> Decision -> Execution -> Artifact -> Distribution -> Audit
Performance -> HR
MarketIntel -> Research / Trading / Operations
BoardProposal -> ApprovalGate -> ExecutionReview
```

更完整地看：

```text
外部情报 / 内部输入
  -> Intent
  -> Decision
  -> Execution
  -> Artifact
  -> Distribution
  -> Audit
  -> Performance / Optimization
  -> BoardProposal / Approval
```

## 3. 组织对象

### 3.1 Department

表示系统中的正式部门，是组织建模的一等对象。

第一版固定为：

- `research`
- `trading`
- `governance`
- `operations`
- `hr`
- `market`

建议字段：

- `department_id`
- `name`
- `description`
- `responsibility_scope`
- `owner_agent_id`
- `kpi_definition`
- `status`

### 3.2 MinisterAgent

表示每个部门对应的部长 Agent。

职责不是替代部门执行，而是：

- 监督；
- 协调；
- 优化；
- 处理小问题；
- 提交中问题和重大事项。

建议字段：

- `agent_id`
- `department_id`
- `role_name`
- `authority_level`
- `escalation_scope`
- `decision_limit`
- `status`

## 4. 业务链路对象

### 4.1 Intent

表示输入目标，是所有治理链路的起点。

来源可以是：

- 用户请求；
- 运营分发需求；
- 研究任务；
- 交易触发；
- 市场情报；
- 审计发现的问题。

建议字段：

- `intent_id`
- `source_type`
- `source_ref`
- `department`
- `actor`
- `payload`
- `constraints`
- `priority`
- `created_at`

### 4.2 Decision

表示 AI 或系统做出的判断、推荐和路由决策。

它用于解决“决策黑箱”。

建议字段：

- `decision_id`
- `trace_id`
- `intent_id`
- `department`
- `policy_version`
- `decision_type`
- `selected_route`
- `reason`
- `evidence_refs`
- `status`
- `created_at`

### 4.3 Execution

表示实际执行了什么。

它用于解决“执行黑箱”。

建议字段：

- `execution_id`
- `trace_id`
- `intent_id`
- `decision_id`
- `workflow_id`
- `workflow_type`
- `department`
- `nodes`
- `tasks`
- `results`
- `status`
- `started_at`
- `finished_at`

### 4.4 Artifact

表示系统产生或使用的产物。

产物包括：

- 研究报告；
- 交易策略；
- 执行结果；
- 审计记录；
- 分发素材；
- 绩效报告；
- 市场情报。

建议字段：

- `artifact_id`
- `title`
- `department`
- `category`
- `type`
- `chain_phase`
- `workflow_id`
- `workflow_type`
- `trace_id`
- `status`
- `relative_path`
- `created_at`

### 4.5 Distribution

表示产物、内容、策略如何被分发。

它用于解决“分发黑箱”。

建议字段：

- `distribution_id`
- `artifact_id`
- `department`
- `target_segment`
- `channel`
- `delivery_policy`
- `reason`
- `result`
- `status`
- `created_at`

### 4.6 Audit

表示一条治理链路的可回放总视图。

它用于解决“审计黑箱”。

建议字段：

- `audit_id`
- `trace_id`
- `department`
- `decision_snapshot`
- `execution_snapshot`
- `distribution_snapshot`
- `events`
- `risk_flags`
- `review_notes`
- `created_at`

## 5. 进化驱动对象

### 5.1 Performance

表示部门绩效、系统绩效、任务绩效和业务结果。

主要服务 HR 和董事会。

建议字段：

- `performance_id`
- `department`
- `period`
- `metric_name`
- `metric_value`
- `baseline`
- `status`
- `comment`

### 5.2 MarketIntel

表示外部市场与竞争情报。

主要服务市场部，同时为研究部、交易部、运营部提供输入。

建议字段：

- `intel_id`
- `source_type`
- `source_ref`
- `topic`
- `symbol`
- `priority`
- `summary`
- `forward_to_department`
- `status`

## 6. 董事会与审批对象

### 6.1 BoardProposal

表示部长 Agent 或董事会生成的治理议案。

建议字段：

- `proposal_id`
- `source_department`
- `initiator_agent_id`
- `decision_level`
- `problem_summary`
- `evidence_refs`
- `recommended_action`
- `expected_impact`
- `rollback_plan`
- `approval_status`
- `created_at`

### 6.2 ApprovalGate

表示重大事项审批门。

建议字段：

- `approval_id`
- `proposal_id`
- `required_role`
- `approver`
- `scope`
- `status`
- `comment`
- `approved_at`

### 6.3 ExecutionReview

表示动作执行后的复盘记录。

建议字段：

- `review_id`
- `proposal_id`
- `execution_id`
- `outcome`
- `lessons`
- `followup_action`
- `created_at`

## 7. 对象映射到现有系统

### 已有对象

当前代码中已有的近似对象：

- `trace_id` -> `Audit` / `Execution` 主键之一
- `route_decisions` -> `Decision`
- `events` -> `Audit.events`
- `task_<id>.json` -> `Execution.tasks`
- `result_<id>.json` -> `Execution.results`
- `ArtifactStore index item` -> `Artifact`

### 尚需补齐的对象

当前尚未正式落地的对象包括：

- `Department`
- `MinisterAgent`
- `Distribution`
- `Performance`
- `MarketIntel`
- `BoardProposal`
- `ApprovalGate`
- `ExecutionReview`

## 8. 最小落地顺序

### Phase 1

先统一以下对象字段：

- `Department`
- `Intent`
- `Decision`
- `Execution`
- `Artifact`
- `Audit`

### Phase 2

再接入：

- `Distribution`
- `Performance`
- `MarketIntel`

### Phase 3

最后接入：

- `MinisterAgent`
- `BoardProposal`
- `ApprovalGate`
- `ExecutionReview`

## 9. 一句话结论

这份对象模型的目的不是“再造一个 ER 图”，而是：

> 让研究、交易、治理、运营、HR、市场部，以及董事会与人工审批，都用同一套对象语言来表达 AI 的判断、执行、分发、审计和进化过程。
