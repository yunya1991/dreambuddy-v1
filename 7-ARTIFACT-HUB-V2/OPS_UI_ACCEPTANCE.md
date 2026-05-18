# OPS UI Skeleton — Governance Acceptance Decision

> Issued by: Governance AGENT (automated)
> Date: 2026-05-18
> Task: task-pr9-ahv2-ops-ui-skeleton-1
> Dependency Gate: ledgered ✅ (task-pr9-artifact-hub-v2-build-1, score 95/100, commit 254d3fe)

---

## Governance Decision: APPROVED — Developer may proceed (Phase 1 scaffold only)

The existing `OPS_UI_README.md` (v1.1, 2026-05-16) and the partial `src/ops-ui/` implementation
provide sufficient context. This file records the governance planning clarification and
unblocks the developer AGENT to complete the minimal scaffold.

---

## Current State Assessment

The `src/ops-ui/` directory **already exists** with partial implementation:

```
7-ARTIFACT-HUB-V2/src/ops-ui/
├── adapters/
│   ├── healthAdapter.ts   ✅ exists
│   ├── traceAdapter.ts    ✅ exists
│   ├── workflowAdapter.ts ✅ exists
│   ├── index.ts           ✅ exists
│   └── mock/              ✅ exists
├── routes/
│   └── index.ts           ✅ exists
├── views/
│   ├── dashboard.ts       ✅ exists
│   └── health.ts          ✅ exists
└── server.ts              ⚠️ empty — needs implementation
```

**Key gap:** `server.ts` is empty. The scaffold exists but is not wired up.

---

## Planning State Clarification

### What Phase 1 REQUIRES (this task)

- [ ] `src/ops-ui/server.ts` — minimal Express server that:
  - Imports and mounts routes from `./routes/index.ts`
  - Serves on a configurable port (default: 3457)
  - Has `GET /health` returning `{ status: "ok" }`
  - Exports the app (for testing)
  - NO live data connections required — static/mock responses acceptable

- [ ] `src/ops-ui/types.ts` — OpsUI-specific types:
  - `OpsUIConfig`: `{ port: number; artifactHubUrl: string; gatewayUrl: string }`
  - `TaskCard`: `{ task_id: string; title: string; status: string; owner_agent: string; updated_at: string }`
  - `AuditRow`: `{ audit_id: string; trace_id: string; event_type: string; agent: string; timestamp: string }`

- [ ] Build passes: `npm run build` in `7-ARTIFACT-HUB-V2` must succeed after changes

### What Phase 1 does NOT require

- Live queries to MetaStore or artifact-store
- WebSocket or SSE connections
- Express routes beyond `/health`
- Authentication/auth middleware
- Production-grade error handling
- UI pages (dashboard.ts/health.ts views can remain as stubs)

### Frozen contracts — DO NOT TOUCH

- `health-summary.v1`
- `trace-summary.v1`
- `route-decision-summary.v1`
- `workflow-summary.v1`

### Shared files — must declare in STARTED comment

- `7-ARTIFACT-HUB-V2/src/types.ts` (if TaskCard/AuditRow added there instead of ops-ui/types.ts)
- `7-ARTIFACT-HUB-V2/src/index.ts` (if ops-ui server exported from package root)

---

## Acceptance Checklist for Developer AGENT

- [ ] `src/ops-ui/server.ts` implemented (minimal Express app, `/health` route, export)
- [ ] `src/ops-ui/types.ts` created with OpsUIConfig, TaskCard, AuditRow
- [ ] `npm run build` passes in `7-ARTIFACT-HUB-V2/`
- [ ] No modification to L1 frozen contracts
- [ ] No direct DB calls in the UI layer (ops-ui must not import meta-store directly)

---

## Next Required Action

**developer AGENT:** Claim task `task-pr9-ahv2-ops-ui-skeleton-1`, create branch
`agent/claude/ops-ui-skeleton-1`, implement `server.ts` + `types.ts` per checklist above,
post STARTED comment declaring shared file usage, then TEST_REPORT and DONE.

---

## Phase 2 Preview (not in scope now)

After Phase 1 scaffold is accepted:
- Wire adapters (healthAdapter, traceAdapter, workflowAdapter) to real MetaStore queries
- Implement dashboard and health views
- Add `/api/ops/*` routes per OPS_UI_README.md §5
