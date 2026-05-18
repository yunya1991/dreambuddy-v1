# ArtifactHub v2 Object Model — Governance Acceptance Decision

> Issued by: Governance AGENT (automated)
> Date: 2026-05-18
> Task: task-pr9-ahv2-object-model-align-1
> Dependency Gate: ledgered ✅ (task-pr9-artifact-hub-v2-build-1, score 95/100, commit 254d3fe)

---

## Governance Decision: APPROVED — Developer may proceed

The existing `OBJECT_MODEL.md` (v1.1, 2026-05-16) provides the authoritative Phase 1 object
definitions. This file records the governance acceptance checklist and unblocks the developer AGENT.

---

## Code Alignment Gap Analysis

| Object | Existing Code | Gap | Action Required |
|--------|---------------|-----|-----------------|
| `Artifact` | `artifact-store.ts`, `ArtifactIndexItem` in `types.ts` | `ArtifactIndexItem` uses `id/title/department/type/date/status/chain_phase` — close to OBJECT_MODEL spec but missing `workflow_id`, `workflow_type`, `trace_id`, `relative_path` | Add missing fields to `ArtifactIndexItem` or create `Artifact` interface |
| `Decision` | `route_decisions` table in `meta-store.ts` | Has `trace_id/decision_id/intent_json/decision_json/policy_version` — missing `department`, `selected_route`, `evidence_refs`, `decision_level` | Align `route_decisions` table schema + add `RouteDecision` TypeScript interface |
| `Execution` | No dedicated type; execution tracked implicitly | Missing `execution_id/workflow_id/workflow_type/department/status/started_at/finished_at` | Create `Execution` interface in `types.ts` |
| `Audit` | `events` table in `meta-store.ts` | Has `trace_id/event_id/type/payload_json/ts` — missing `department/decision_snapshot/execution_snapshot/risk_flags/review_notes` | Create `AuditRecord` interface; consider `audit_records` table |

---

## Acceptance Checklist for Developer AGENT

### Phase 1 Required (this task)

**A. `7-ARTIFACT-HUB-V2/src/types.ts` additions:**
- [ ] `Artifact` interface with fields: `artifact_id`, `title`, `department`, `category`, `type`, `chain_phase`, `workflow_id`, `workflow_type`, `trace_id`, `status`, `relative_path`, `created_at`
- [ ] `Decision` interface with fields: `decision_id`, `trace_id`, `intent_id`, `department`, `policy_version`, `selected_route`, `reason`, `evidence_refs`, `decision_level`, `created_at`
- [ ] `Execution` interface with fields: `execution_id`, `trace_id`, `intent_id`, `decision_id`, `workflow_id`, `workflow_type`, `department`, `status`, `started_at`, `finished_at?`
- [ ] `AuditRecord` interface with fields: `audit_id`, `trace_id`, `department`, `decision_snapshot`, `execution_snapshot`, `events`, `risk_flags?`, `review_notes?`, `created_at`

**B. `7-ARTIFACT-HUB-V2/src/meta-store.ts` schema updates:**
- [ ] `route_decisions` table gains columns: `department TEXT`, `selected_route TEXT`, `decision_level TEXT`
- [ ] New `executions` table: `(execution_id, trace_id, intent_id, decision_id, workflow_id, workflow_type, department, status, started_at, finished_at)`
- [ ] New `audit_records` table: `(audit_id, trace_id, department, decision_snapshot_json, execution_snapshot_json, events_json, risk_flags_json, review_notes, created_at)`

**C. Naming conventions (must match OBJECT_MODEL.md §4):**
- TypeScript interface fields: camelCase
- SQLite column names: snake_case
- Table names: plural (`artifacts`, `audit_records`, `decisions`, `executions`)

**D. Existing code preservation:**
- [ ] `ArtifactIndexItem` (used by ops-ui adapters) must remain — do NOT remove, extend if needed
- [ ] `DagNode`, `DagEdge`, `RoutingPlan`, `Intent` types must remain unchanged (L1-adjacent)
- [ ] Existing `events` and `route_decisions` tables in MetaStore must remain backward-compatible

### Not required in this task
- Runtime data population of new tables (schema + interfaces only)
- Migration of existing records
- UI changes in ops-ui (separate task: ops-ui-skeleton-1)
- Phase 2/3 objects (Distribution, Performance, MarketIntel, etc.)

---

## Next Required Action
**developer AGENT:** Claim task `task-pr9-ahv2-object-model-align-1`, create branch
`agent/claude/object-model-align-1`, implement types per checklist A-D above,
post STARTED comment, then TEST_REPORT and DONE.

---

## Governance Closure Note
Once developer delivers and validator scores ≥ 80, this task moves to `accepted`.
That will unblock `task-pr9-ahv2-chain-workflows-plan-1` (dependency_gate: accepted).
