# AGENT Collaboration Constitution (Fail-Closed)

> Status: active  
> Scope: dreambuddy-v1 repository collaboration  
> Source of truth: `AGENT协作工具/docs/*`

## 0. Purpose

This constitution defines the non-negotiable collaboration rules for all AGENTs working in this repository.

## 1. Source of Truth

- Collaboration documentation source of truth lives in `AGENT协作工具/docs/`.
- Legacy documents may exist elsewhere; when inconsistent, this constitution wins.

## 2. Roles (Behavior-Defined)

- Governance AGENT: merge gates, conflict resolution, branch closeout, final merge.
- Ledger/Protocol AGENT: evolves collaboration protocol docs, ledger structures, contracts; does not handle merges/conflicts.
- Developer AGENT: implements changes in declared scope; produces delivery evidence.
- Validator AGENT: runs validation, scores quality, publishes `VALIDATION_RESULT`.

## 3. Default Workspace & Branch Policy

- Default workspace: `7-ARTIFACT-HUB-V2/**`.
- Each AGENT works on its own `agent/<agent_id>/*` branch and opens an independent PR.
- Working directly on `main` is forbidden.
- If branch metadata becomes inconsistent or cannot be renamed reliably: prefer “new branch + new PR” as the fail-closed strategy.

## 4. Mandatory PR Protocol (Fail-Closed)

An AGENT PR MUST satisfy all of the following:

- PR body includes required fields (task card, owner agent, shared file declaration).
- Comments include required anchors:
  - `[方案评审记录 / DESIGN_REVIEW]` (must include `Reviewer:`)
  - `[协作开工声明 / STARTED]`
  - `[测试报告 / TEST_REPORT]`
  - `[协作完成回报 / DONE]`
- If scope changes: `[协作状态更新 / UPDATED]` MUST be posted before changing scope.
- If blocked: `[协作阻塞通知 / BLOCKED]` MUST be posted.

## 5. Scope & Exception Declaration

- If the work touches any path outside the default workspace, the PR MUST declare it in `STARTED` (and `UPDATED` when changed).
- Shared boundaries MUST be declared and treated as strong-sync points.

## 6. Hard Boundaries: Governance vs Ledger/Protocol

- Ledger/Protocol AGENT MUST NOT modify:
  - `.github/workflows/**`
  - `AGENT协作工具/github-actions/**`
  - `AGENT协作工具/SKILLS/**` (except purely documentary text that does not change behavior)
- Governance AGENT MUST NOT “fix gates” by directly editing `AGENT协作工具/ledger/**`.

## 7. Conflict Resolution Priority

1. If PR metadata/branch policy is unsatisfied and cannot be repaired safely: create a replacement PR and close the original.
2. If massive add/add conflicts: use a rescue branch (clean base from `main`, then move only the effective changes).
3. If shared boundaries are touched: switch to strong-sync and require explicit coordination.

## 8. When Blocked: What to Read First

- Policy dispute / “is this allowed?”: `00-AGENT-CONSTITUTION.md`
- Comment fields / templates / required anchors: `01-COLLABORATION-PROTOCOL.md`
- Role responsibilities & system chain: `02-ARCHITECTURE.md`
- Step-by-step execution / gates / closeout: `03-WORKFLOWS-AND-NORMS.md`
- “Which file should I edit?”: `04-ENGINEERING-INDEX.md`
- Automation/CI/ledger issues: `05-FAQ.md`
- “Which SKILL should I call?”: `06-SKILLS-INVENTORY.md`
