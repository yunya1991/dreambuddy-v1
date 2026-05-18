# Collaboration Protocol (PR Comments + Gates)

> Status: active
> Scope: collaboration protocol for PR-based work in `dreambuddy-v1`

## 1. Canonical Anchors

Structured PR comments are the canonical collaboration interface.

- `[协作开工声明 / STARTED]`
- `[协作状态更新 / UPDATED]`
- `[协作阻塞通知 / BLOCKED]`
- `[方案评审记录 / DESIGN_REVIEW]`
- `[测试报告 / TEST_REPORT]`
- `[验证结论 / VALIDATION_RESULT]`
- `[协作完成回报 / DONE]`
- `[账本同步 / LEDGER_SYNC]` ⭐ new — posted by CLI or GitHub Action when ledger/workspace state changes

Templates live in `AGENT协作工具/templates/`.

## 2. Minimal Required Fields

### 2.1 STARTED

- `Agent: <agent_id>`
- `任务: <task_name>`
- `Task ID: <task_id>`
- `分支: <agent/*>`
- `Workspace Path: <path>` (default `7-ARTIFACT-HUB-V2`; must be explicit if different)
- `计划修改:` list
- `占用范围:` list (strong-sync boundaries)
- `冲突门禁结果:` decision + reason_codes

### 2.2 DESIGN_REVIEW

- `Agent: <agent_id>`
- `Reviewer: <agent_id>` (must be present; reviewer must be non-owner for lifecycle gate)
- `Decision: APPROVED | CHANGES_REQUESTED | REJECTED`
- `Scope:` list

### 2.3 TEST_REPORT

- `Tester: <agent_id>`
- `Decision: TEST_PASS | TEST_FAIL | RISK_ACCEPTED`
- Evidence (commands, artifacts, paths)

### 2.4 VALIDATION_RESULT

- `Validator: <agent_id>`
- `Decision: ACCEPTED | REWORK | BLOCK`
- `Score: <0-100>`
- `Governance Handoff: ledgered | archived | pending`

### 2.5 DONE

- `Agent: <agent_id>`
- `提交: <commit sha>`
- Delivery summary

### 2.6 LEDGER_SYNC (new)

- `Sync Agent: CLI | GitHub Action`
- `Protocol File: <path to LEDGER-YYYYMMDD.md>`
- `Changed Tasks:` list of `<task_id>: <old> → <new>` (CLI may print `old -> new`)
- `Workspace Updated: <workspace>/PLAN.md`
- `Ledger SHA: <before> → <after>`
- `Sync Time: <ISO8601>`

This anchor is posted automatically by `ledger_sync.py push-status --print-comment` or by the `collab-ledger-sync.yml` GitHub Action. It is informational and does not trigger lifecycle gate checks.

Notes:

- `Changed Tasks` is a sync-facing snapshot message, not a strict diff audit. If the old status cannot be derived, `old_status` may be `?`, but `Ledger SHA` MUST be present.
- Optional fields (backward compatible):
  - `Workspace: <workspace_path>`
  - `Sync State File: <workspace>/.ledger-sync.json`
  - `Protocol Version: v1`
  - `Generator: collab-ledger-planner@2.0`

## 3. Scope Change Rule (Fail-Closed)

- Any change that expands scope MUST post `[UPDATED]` first.
- If scope touches outside default workspace, it MUST be explicitly declared.

## 4. Block Rule (Fail-Closed)

- If execution cannot continue, post `[BLOCKED]` and stop.
- A blocked PR must not be force-pushed with unrelated changes to "unstick" gates.

## 5. Gates

- Lifecycle guard is enforced by repo workflows and validates:
  - task card present
  - design review present
  - started present
  - test report present
  - done present
  - non-owner review present
  - branch policy valid
  - shared files declared

If a gate fails, treat it as an instruction to produce missing protocol evidence, not as something to bypass.
