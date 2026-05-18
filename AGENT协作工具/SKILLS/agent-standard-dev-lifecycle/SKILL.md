---
name: agent-standard-dev-lifecycle
description: 全 AGENT 通用的标准研发生命周期编排器。触发词：生命周期、开发流程、研发流程、implementation lifecycle、agent lifecycle
version: "1.0"
created: "2026-05-17"
status: "draft"
---

# Agent Standard Dev Lifecycle

## 目标

统一编排以下阶段：

1. Phase 0 任务登记
2. Phase 1 方案评审
3. Phase 2 实施计划
4. Phase 3 开工门禁
5. Phase 4 开发执行
6. Phase 5 测试验证
7. Phase 6 PR 评审
8. Phase 7 合入监督
9. Phase 8 完成归档

## 输入

- task card
- owner_agent
- target_pr
- target_branch
- files_in_scope
- contracts_depended

## 输出

- current_phase
- phase_result
- next_action
- missing_evidence
