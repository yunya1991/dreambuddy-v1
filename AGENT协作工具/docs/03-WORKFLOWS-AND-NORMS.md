# Workflows & Norms

> Status: active  
> Default workspace: `7-ARTIFACT-HUB-V2/**`

## 1. Standard Workflow (PR-Based)

1. Run conflict gate (before editing).
2. Open PR on `agent/<agent_id>/*` branch.
3. Post `DESIGN_REVIEW` (include `Reviewer:`).
4. Post `STARTED` (declare workspace, scope, occupied boundaries).
5. Implement within scope.
6. If scope changes, post `UPDATED` first.
7. If ledger/task status changes, run `ledger_sync.py push-status` and post `LEDGER_SYNC`.
8. Post `TEST_REPORT` with evidence.
9. Validator posts `VALIDATION_RESULT` with score and decision.
10. Post `DONE` with delivery summary.
11. Governance AGENT merges after all gates pass.

## 2. Role-Specific Norms

### 2.1 Ledger/Protocol AGENT

- Only changes:
  - `AGENT协作工具/docs/**`
  - `AGENT协作工具/ledger/**`
  - `docs/superpowers/contracts/**`
- Produces:
  - protocol updates, indices, FAQs, and contracts
  - PRs that remain strictly within the allowed scope

### 2.2 Governance AGENT

- Owns: conflict resolution, merge gate compliance, final merge.
- If protocol/docs/ledger needs changes: request Ledger/Protocol AGENT to open a separate PR.

### 2.3 Developer AGENT

- Must not touch shared boundaries without declaration and strong-sync.
- Must not bypass gates by “silent commits”; protocol evidence is part of delivery.

### 2.4 Validator AGENT

- Must publish `VALIDATION_RESULT` (PASS/REWORK/BLOCK + score).
- Must not accept without executable evidence.

## 3. When Blocked: Lookup Table

- Gate failure reason codes: check `05-FAQ.md` then fix by posting missing protocol anchors.
- “Not sure where to edit”: check `04-ENGINEERING-INDEX.md`.
- “Protocol conflict / allowed scope dispute”: check `00-AGENT-CONSTITUTION.md`.
- “Which template to use”: check `01-COLLABORATION-PROTOCOL.md` and `AGENT协作工具/templates/`.
