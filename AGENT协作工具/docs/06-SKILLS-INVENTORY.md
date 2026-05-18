# SKILLS Inventory

> Source of truth: `AGENT协作工具/SKILLS/*/SKILL.md`

## 0. Rule of Thumb

- Before any code edits: run `dual-agent-conflict-gate`.
- If a rule/gate/protocol is unclear: stop and consult `AGENT协作工具/docs/`.

## 1. Skills List

### 1.1 dual-agent-conflict-gate

- Spec: `AGENT协作工具/SKILLS/dual-agent-conflict-gate/SKILL.md`
- Purpose: pre-flight conflict detection (branch policy, ownership boundaries, shared boundaries, contract freeze level).
- When to use: before every task; before scope expansion.

### 1.2 agent-standard-dev-lifecycle

- Spec: `AGENT协作工具/SKILLS/agent-standard-dev-lifecycle/SKILL.md`
- Purpose: lifecycle phase orchestration (Phase 0-8).
- When to use: when you need to drive a task end-to-end with evidence checkpoints.

### 1.3 agent-design-review

- Spec: `AGENT协作工具/SKILLS/agent-design-review/SKILL.md`
- Purpose: design review checklist and decisions (APPROVED/CHANGES_REQUESTED/REJECTED).
- When to use: before STARTED for non-trivial scope; always when gate requires DESIGN_REVIEW.

### 1.4 agent-dev-execution

- Spec: `AGENT协作工具/SKILLS/agent-dev-execution/SKILL.md`
- Purpose: enforce dev execution order (plan → gate → STARTED → implement → evidence → DONE).
- When to use: when you are the active implementer of a scoped change.

### 1.5 agent-quality-test

- Spec: `AGENT协作工具/SKILLS/agent-quality-test/SKILL.md`
- Purpose: generate `TEST_REPORT` with unit/integration/scenario evidence.
- When to use: before asking for validation or merge.

### 1.6 agent-collab-supervisor

- Spec: `AGENT协作工具/SKILLS/agent-collab-supervisor/SKILL.md`
- Purpose: supervision of protocol evidence and branch compliance; used by lifecycle guard.
- When to use: when PR is blocked by lifecycle guard, to understand missing evidence.

### 1.7 collab-ledger-planner ⭐

- Spec: `AGENT协作工具/SKILLS/collab-ledger-planner/SKILL.md`
- Purpose: parse a technical plan/design Markdown into structured ledger tasks + sync workspace.
- When to use: when receiving a technical document to decompose into a `tasks/index.json` task list; when setting up a new workspace plan.
- Trigger words: 任务拆解、规划拆解、plan to tasks、生成任务清单、生成账本清单协议
- Output (three artifacts):
  1. `AGENT协作工具/ledger/tasks/index.json` — new tasks written
  2. `AGENT协作工具/ledger/protocols/{WORKSPACE}-LEDGER-{YYYYMMDD}.md` — protocol Markdown
  3. `{workspace}/PLAN.md` — task progress snapshot
- One-command usage:
  ```bash
  python3 AGENT协作工具/SKILLS/collab-ledger-planner/ledger_sync.py sync \
    --plan <tech-doc.md> --goal-id <goal-x> --workspace 7-ARTIFACT-HUB-V2
  ```
- Post-task sync: `ledger_sync.py push-status --workspace 7-ARTIFACT-HUB-V2 --print-comment`
- Auto-sync: `.github/workflows/collab-ledger-sync.yml` fires on `index.json` changes to main

## 2. Operational Scripts (Non-SKILL but Critical)

- Lifecycle payload builder: `AGENT协作工具/github-actions/build_agent_lifecycle_payload.py`
- Lifecycle checker: `AGENT协作工具/github-actions/check_agent_lifecycle.py`
- Collaboration payload builder/checker: `AGENT协作工具/github-actions/build_agent_collaboration_payload.py`, `check_agent_collaboration.py`
- Ledger cycle runner: `AGENT协作工具/github-actions/run_governance_ledger_cycle.py`
- Ledger updater: `AGENT协作工具/github-actions/update_agent_ledger.py`
- **Ledger sync CLI**: `AGENT协作工具/SKILLS/collab-ledger-planner/ledger_sync.py` (sync/push-status/status)
- **Plan parser**: `AGENT协作工具/SKILLS/collab-ledger-planner/plan_to_tasks.py`
