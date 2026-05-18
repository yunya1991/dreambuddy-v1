# Collaboration System Architecture

> Status: active  
> Focus: roles, data flow, and source-of-truth files

## 1. Core Roles

- Governance AGENT: governs merges and conflicts; enforces gates; closes out PRs.
- Ledger/Protocol AGENT: evolves protocol docs, ledger schema, contracts; produces protocol PRs.
- Developer AGENT: implements within declared scope; posts `STARTED/UPDATED/DONE`.
- Validator AGENT: validates and posts `VALIDATION_RESULT`; supplies score and decision.

## 2. Source-of-Truth Artifacts

- Protocol docs: `AGENT协作工具/docs/*`
- Comment templates: `AGENT协作工具/templates/*`
- Lifecycle gate rules: `AGENT协作工具/SKILLS/agent-collab-supervisor/rules.json`
- Gate checkers: `AGENT协作工具/github-actions/*`
- Ledger:
  - tasks: `AGENT协作工具/ledger/tasks/index.json`
  - rewards: `AGENT协作工具/ledger/rewards/index.json`
- Contracts: `docs/superpowers/contracts/**`

## 3. Runtime Data Flow (PR-Centric)

1. Developer posts `STARTED` (declares scope + conflict gate result).
2. Developer posts `TEST_REPORT` (local evidence).
3. Validator posts `VALIDATION_RESULT` (decision + score + handoff).
4. Claim/ledger workflows advance task status and write rewards (when state changes).
5. Governance AGENT merges only when gates and validation are satisfied.

## 4. Automation Placement

- “Gates” live as GitHub Actions workflows and python scripts under `AGENT协作工具/github-actions/`.
- Self-hosted runner setup is documented under `AGENT协作工具/docs/self-hosted-runner.md` (trialed on PR9).
