# Engineering Index

> Status: active  
> Purpose: quickly locate the correct file to change

## 1. Directories

- `AGENT协作工具/docs/`: protocol source-of-truth docs
- `AGENT协作工具/templates/`: PR comment templates
- `AGENT协作工具/SKILLS/`: SKILL specs and guard configurations
- `AGENT协作工具/github-actions/`: gate checkers, payload builders, ledger cycle runner
- `AGENT协作工具/ledger/`: tasks and rewards ledgers
- `docs/superpowers/contracts/`: frozen contracts registry and schemas

## 2. What to Edit (Common Tasks)

### 2.1 Protocol Wording / Constitution / FAQs

- edit `AGENT协作工具/docs/00-AGENT-CONSTITUTION.md`
- edit `AGENT协作工具/docs/01-COLLABORATION-PROTOCOL.md`
- edit `AGENT协作工具/docs/05-FAQ.md`

### 2.2 Add/Change PR Comment Templates

- edit `AGENT协作工具/templates/*.md`
- lifecycle parsing logic: `AGENT协作工具/github-actions/build_agent_lifecycle_payload.py`

### 2.3 Change Lifecycle Gate Rules

- rules: `AGENT协作工具/SKILLS/agent-collab-supervisor/rules.json`
- checkers: `AGENT协作工具/github-actions/check_agent_lifecycle.py`

### 2.4 Change Ledger or Reward Logic

- runner/controller: `AGENT协作工具/github-actions/run_governance_ledger_cycle.py`
- ledger updater: `AGENT协作工具/github-actions/update_agent_ledger.py`
- ledgers:
  - `AGENT协作工具/ledger/tasks/index.json`
  - `AGENT协作工具/ledger/rewards/index.json`

### 2.5 Conflict Gate Behavior / Boundaries

- behavior: `AGENT协作工具/SKILLS/dual-agent-conflict-gate/conflict_gate.py`
- boundaries & contracts: `AGENT协作工具/SKILLS/dual-agent-conflict-gate/gatekeeper_config.json`

## 3. Gate Evidence Checklist (Where to Look)

- Task Card: PR body (`.github/pull_request_template.md`)
- DESIGN_REVIEW: PR comment (`AGENT协作工具/templates/design-review-comment.md`)
- STARTED: PR comment (`AGENT协作工具/templates/pr-comment-started.md`)
- TEST_REPORT: PR comment (`AGENT协作工具/templates/test-report-comment.md`)
- VALIDATION_RESULT: PR comment (`AGENT协作工具/templates/pr-comment-validation-result.md`)
- DONE: PR comment (`AGENT协作工具/templates/pr-comment-done.md`)
