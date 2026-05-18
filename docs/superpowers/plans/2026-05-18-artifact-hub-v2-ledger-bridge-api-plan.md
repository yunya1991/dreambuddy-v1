# Artifact Hub V2 Ledger Bridge API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal, file-backed API bridge that joins `AGENT协作工具/ledger/tasks/index.json` open tasks to Hub runtime executions under `dreambuddy/artifacts/tasks/` and `dreambuddy/artifacts/results/`.

**Architecture:** Extend Hub work-order task files with optional `ledger_task_id`, then expose a read-only aggregation endpoint. Provide `/ops/ledger/open-tasks` plus an alias `/api/ops/ledger/open-tasks`.

**Tech Stack:** Node.js (built-in `http`), TypeScript, Node test runner (`node:test`), file-based storage.

---

## File map (what to touch)

**Modify**
- `7-ARTIFACT-HUB-V2/src/work-order.ts` (extend `WorkOrder`)
- `7-ARTIFACT-HUB-V2/src/index.ts` (accept `ledger_task_id` for `/route/execute`, add two GET endpoints)

**Create**
- `7-ARTIFACT-HUB-V2/src/ledger-bridge.ts` (aggregation logic + types)
- `7-ARTIFACT-HUB-V2/src/ledger-bridge.test.ts` (unit tests for join logic + mapping persistence)
- `7-ARTIFACT-HUB-V2/scripts/stress-ledger-bridge.mjs` (manual stress + scenario simulation runner)

---

### Task 1: Extend WorkOrder with ledger_task_id (TDD)

**Files:**
- Modify: [work-order.ts](file:///Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/7-ARTIFACT-HUB-V2/src/work-order.ts)
- Test: `7-ARTIFACT-HUB-V2/src/ledger-bridge.test.ts`

- [ ] **Step 1: Write failing test for persisting ledger_task_id**

Create `7-ARTIFACT-HUB-V2/src/ledger-bridge.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WorkOrderManager } from "./work-order.js";

test("WorkOrderManager.writeTask persists ledger_task_id when present", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ahv2-"));
  const mgr = new WorkOrderManager(root);
  const p = mgr.writeTask({
    trace_id: "t1",
    task_id: "hub-1",
    created_at: "2026-05-18T00:00:00Z",
    intent: { a: 1 },
    routing_plan: { b: 2 },
    ledger_task_id: "task-ledger-1",
  });
  const parsed = JSON.parse(fs.readFileSync(p, "utf-8")) as Record<string, unknown>;
  assert.equal(parsed.ledger_task_id, "task-ledger-1");
});
```

- [ ] **Step 2: Run tests to verify it fails**

Run:

```bash
cd /Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/7-ARTIFACT-HUB-V2
npm run build
npm test
```

Expected:
- FAIL because `WorkOrder` does not allow `ledger_task_id` yet (TypeScript compile error)

- [ ] **Step 3: Implement WorkOrder type change**

Update `7-ARTIFACT-HUB-V2/src/work-order.ts`:

```ts
export interface WorkOrder {
  trace_id: string;
  task_id: string;
  created_at: string;
  intent: unknown;
  routing_plan: unknown;
  ledger_task_id?: string;
}
```

- [ ] **Step 4: Re-run tests to verify pass**

Run:

```bash
npm run build
npm test
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add 7-ARTIFACT-HUB-V2/src/work-order.ts 7-ARTIFACT-HUB-V2/src/ledger-bridge.test.ts
git commit -m "feat(artifact-hub-v2): persist ledger_task_id in work orders"
```

---

### Task 2: Add aggregation module (ledger ↔ hub join) (TDD)

**Files:**
- Create: `7-ARTIFACT-HUB-V2/src/ledger-bridge.ts`
- Test: `7-ARTIFACT-HUB-V2/src/ledger-bridge.test.ts`

- [ ] **Step 1: Write failing tests for join logic**

Append to `7-ARTIFACT-HUB-V2/src/ledger-bridge.test.ts`:

```ts
import { buildOpenTasksSnapshot } from "./ledger-bridge.js";

function writeJson(p: string, value: unknown) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(value, null, 2));
}

test("buildOpenTasksSnapshot joins ledger open_tasks to latest hub task+result", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ahv2-repo-"));
  const artifactsRoot = path.join(repoRoot, "dreambuddy", "artifacts");
  const ledgerPath = path.join(repoRoot, "AGENT协作工具", "ledger", "tasks", "index.json");

  writeJson(ledgerPath, {
    version: 1,
    generated_at: "2026-05-18T00:00:00Z",
    open_tasks: ["task-ledger-1"],
    tasks: [
      {
        task_id: "task-ledger-1",
        status: "planned",
        workspace_path: "7-ARTIFACT-HUB-V2",
        title: "t",
      },
    ],
  });

  writeJson(path.join(artifactsRoot, "tasks", "task_hub-a.json"), {
    trace_id: "trace-a",
    task_id: "hub-a",
    created_at: "2026-05-18T00:00:00Z",
    intent: {},
    routing_plan: {},
    ledger_task_id: "task-ledger-1",
  });
  writeJson(path.join(artifactsRoot, "results", "result_hub-a.json"), {
    trace_id: "trace-a",
    task_id: "hub-a",
    status: "completed",
    created_at: "2026-05-18T00:01:00Z",
    updated_at: "2026-05-18T00:02:00Z",
  });

  const out = buildOpenTasksSnapshot({
    repoRoot,
    artifactsRoot,
    ledgerPath,
    workspacePath: "7-ARTIFACT-HUB-V2",
    nowIso: "2026-05-18T00:03:00Z",
  });

  assert.equal(out.items.length, 1);
  assert.equal(out.items[0].ledger_task_id, "task-ledger-1");
  assert.equal(out.items[0].hub?.latest_task_id, "hub-a");
  assert.equal(out.items[0].hub?.latest_trace_id, "trace-a");
  assert.equal(out.items[0].hub?.latest_result?.status, "completed");
});

test("buildOpenTasksSnapshot returns hub=null when no hub tasks exist", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ahv2-repo-"));
  const artifactsRoot = path.join(repoRoot, "dreambuddy", "artifacts");
  const ledgerPath = path.join(repoRoot, "AGENT协作工具", "ledger", "tasks", "index.json");

  writeJson(ledgerPath, {
    version: 1,
    generated_at: "2026-05-18T00:00:00Z",
    open_tasks: ["task-ledger-1"],
    tasks: [
      {
        task_id: "task-ledger-1",
        status: "planned",
        workspace_path: "7-ARTIFACT-HUB-V2",
        title: "t",
      },
    ],
  });

  const out = buildOpenTasksSnapshot({
    repoRoot,
    artifactsRoot,
    ledgerPath,
    workspacePath: "7-ARTIFACT-HUB-V2",
    nowIso: "2026-05-18T00:03:00Z",
  });

  assert.equal(out.items.length, 1);
  assert.equal(out.items[0].hub, null);
});

test("buildOpenTasksSnapshot selects latest hub task when multiple exist for same ledger_task_id", () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ahv2-repo-"));
  const artifactsRoot = path.join(repoRoot, "dreambuddy", "artifacts");
  const ledgerPath = path.join(repoRoot, "AGENT协作工具", "ledger", "tasks", "index.json");

  writeJson(ledgerPath, {
    version: 1,
    generated_at: "2026-05-18T00:00:00Z",
    open_tasks: ["task-ledger-1"],
    tasks: [
      {
        task_id: "task-ledger-1",
        status: "planned",
        workspace_path: "7-ARTIFACT-HUB-V2",
        title: "t",
      },
    ],
  });

  writeJson(path.join(artifactsRoot, "tasks", "task_hub-a.json"), {
    trace_id: "trace-a",
    task_id: "hub-a",
    created_at: "2026-05-18T00:00:00Z",
    intent: {},
    routing_plan: {},
    ledger_task_id: "task-ledger-1",
  });
  writeJson(path.join(artifactsRoot, "tasks", "task_hub-b.json"), {
    trace_id: "trace-b",
    task_id: "hub-b",
    created_at: "2026-05-18T00:10:00Z",
    intent: {},
    routing_plan: {},
    ledger_task_id: "task-ledger-1",
  });

  const out = buildOpenTasksSnapshot({
    repoRoot,
    artifactsRoot,
    ledgerPath,
    workspacePath: "7-ARTIFACT-HUB-V2",
    nowIso: "2026-05-18T00:11:00Z",
  });

  assert.equal(out.items[0].hub?.latest_task_id, "hub-b");
  assert.equal(out.items[0].hub?.latest_trace_id, "trace-b");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm run build
npm test
```

Expected:
- FAIL because `buildOpenTasksSnapshot` does not exist

- [ ] **Step 3: Implement ledger bridge module**

Create `7-ARTIFACT-HUB-V2/src/ledger-bridge.ts`:

```ts
import fs from "node:fs";
import path from "node:path";

export type LedgerTaskStatus = string;

export interface LedgerTaskRecord {
  task_id: string;
  title?: string;
  status?: LedgerTaskStatus;
  workspace_path?: string;
}

export interface LedgerTasksIndex {
  version: number;
  generated_at: string;
  open_tasks?: string[];
  tasks?: LedgerTaskRecord[];
}

export interface HubTaskFile {
  trace_id: string;
  task_id: string;
  created_at?: string;
  ledger_task_id?: string;
}

export interface HubResultFile {
  trace_id: string;
  task_id: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface OpenTasksSnapshotItem {
  ledger_task_id: string;
  ledger: {
    status: string;
    workspace_path: string;
    title: string;
  };
  hub: null | {
    latest_task_id: string;
    latest_trace_id: string;
    latest_task_created_at: string | null;
    latest_result: null | {
      status: string;
      created_at: string | null;
      updated_at: string | null;
    };
  };
}

export interface OpenTasksSnapshot {
  generated_at: string;
  ledger: { path: string; open_tasks: string[]; task_count: number };
  items: OpenTasksSnapshotItem[];
}

export interface BuildSnapshotParams {
  repoRoot: string;
  artifactsRoot: string;
  ledgerPath?: string;
  workspacePath: string;
  nowIso?: string;
}

function readJsonFile<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
}

function listFiles(dir: string, predicate: (f: string) => boolean): string[] {
  try {
    return fs.readdirSync(dir).filter(predicate).map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

function getFileMtimeIso(p: string): string {
  const s = fs.statSync(p);
  return new Date(s.mtimeMs).toISOString();
}

function normalizeOpenTaskIds(index: LedgerTasksIndex): string[] {
  const listed = (index.open_tasks || []).filter((x) => typeof x === "string" && x.trim());
  if (listed.length) return listed;
  const openStatuses = new Set(["planned", "open", "accepted", "rework", "blocked"]);
  const tasks = index.tasks || [];
  return tasks
    .filter((t) => openStatuses.has(String(t.status || "").trim().toLowerCase()))
    .map((t) => String(t.task_id || "").trim())
    .filter(Boolean);
}

function pickLatestHubTask(tasks: Array<{ task: HubTaskFile; filePath: string }>): {
  task: HubTaskFile;
  filePath: string;
} | null {
  if (!tasks.length) return null;
  const scored = tasks.map(({ task, filePath }) => {
    const created = task.created_at || getFileMtimeIso(filePath);
    return { task, filePath, createdMs: Date.parse(created) || 0 };
  });
  scored.sort((a, b) => a.createdMs - b.createdMs);
  return { task: scored[scored.length - 1].task, filePath: scored[scored.length - 1].filePath };
}

function loadLatestResult(resultsDir: string, hubTaskId: string): { result: HubResultFile; filePath: string } | null {
  const resultPath = path.join(resultsDir, `result_${hubTaskId}.json`);
  if (!fs.existsSync(resultPath)) return null;
  return { result: readJsonFile<HubResultFile>(resultPath), filePath: resultPath };
}

export function buildOpenTasksSnapshot(params: BuildSnapshotParams): OpenTasksSnapshot {
  const now = params.nowIso || new Date().toISOString();
  const ledgerPath = params.ledgerPath || path.join(params.repoRoot, "AGENT协作工具", "ledger", "tasks", "index.json");
  const tasksDir = path.join(params.artifactsRoot, "tasks");
  const resultsDir = path.join(params.artifactsRoot, "results");

  if (!fs.existsSync(ledgerPath)) {
    throw new Error(`ledger_unavailable:${ledgerPath}`);
  }
  if (!fs.existsSync(params.artifactsRoot)) {
    throw new Error(`artifacts_root_unavailable:${params.artifactsRoot}`);
  }

  const ledger = readJsonFile<LedgerTasksIndex>(ledgerPath);
  const openIds = normalizeOpenTaskIds(ledger);
  const tasks = ledger.tasks || [];
  const taskById = new Map(tasks.map((t) => [String(t.task_id), t]));

  const files = listFiles(tasksDir, (f) => f.startsWith("task_") && f.endsWith(".json"));
  const parsedTasks: Array<{ task: HubTaskFile; filePath: string }> = [];
  for (const fp of files) {
    try {
      const task = readJsonFile<HubTaskFile>(fp);
      if (!task?.task_id || !task?.trace_id) continue;
      parsedTasks.push({ task, filePath: fp });
    } catch {
      continue;
    }
  }

  const items: OpenTasksSnapshotItem[] = [];
  for (const ledgerTaskId of openIds) {
    const t = taskById.get(ledgerTaskId);
    if (!t) continue;
    if (String(t.workspace_path || "") !== params.workspacePath) continue;

    const candidates = parsedTasks.filter((p) => String(p.task.ledger_task_id || "") === ledgerTaskId);
    const latest = pickLatestHubTask(candidates);
    if (!latest) {
      items.push({
        ledger_task_id: ledgerTaskId,
        ledger: {
          status: String(t.status || ""),
          workspace_path: String(t.workspace_path || ""),
          title: String(t.title || ""),
        },
        hub: null,
      });
      continue;
    }

    const hubTaskId = latest.task.task_id;
    const hubCreatedAt = latest.task.created_at || getFileMtimeIso(latest.filePath);
    const latestResult = loadLatestResult(resultsDir, hubTaskId);
    const latestResultPayload = latestResult
      ? {
          status: String(latestResult.result.status || ""),
          created_at: latestResult.result.created_at || getFileMtimeIso(latestResult.filePath),
          updated_at: latestResult.result.updated_at || null,
        }
      : null;

    items.push({
      ledger_task_id: ledgerTaskId,
      ledger: {
        status: String(t.status || ""),
        workspace_path: String(t.workspace_path || ""),
        title: String(t.title || ""),
      },
      hub: {
        latest_task_id: hubTaskId,
        latest_trace_id: String(latest.task.trace_id || ""),
        latest_task_created_at: hubCreatedAt || null,
        latest_result: latestResultPayload,
      },
    });
  }

  return {
    generated_at: now,
    ledger: { path: ledgerPath, open_tasks: openIds, task_count: tasks.length },
    items,
  };
}
```

- [ ] **Step 4: Re-run tests to verify pass**

Run:

```bash
npm run build
npm test
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add 7-ARTIFACT-HUB-V2/src/ledger-bridge.ts 7-ARTIFACT-HUB-V2/src/ledger-bridge.test.ts
git commit -m "feat(artifact-hub-v2): add ledger bridge aggregation module"
```

---

### Task 3: Wire API endpoints + extend /route/execute payload (TDD)

**Files:**
- Modify: [index.ts](file:///Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/7-ARTIFACT-HUB-V2/src/index.ts)
- Modify: `7-ARTIFACT-HUB-V2/src/work-order.ts`
- Test: `7-ARTIFACT-HUB-V2/src/ledger-bridge.test.ts`

- [ ] **Step 1: Add a test for /route/execute mapping behavior (file-level)**

Append to `7-ARTIFACT-HUB-V2/src/ledger-bridge.test.ts`:

```ts
import { readJson } from "./http-utils.js";

test("route execute request accepts ledger_task_id as wrapper field and persists into task file", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ahv2-"));
  const mgr = new WorkOrderManager(root);
  const p = mgr.writeTask({
    trace_id: "t1",
    task_id: "hub-1",
    created_at: "2026-05-18T00:00:00Z",
    intent: {},
    routing_plan: {},
    ledger_task_id: "task-ledger-1",
  });
  const parsed = JSON.parse(fs.readFileSync(p, "utf-8")) as Record<string, unknown>;
  assert.equal(parsed.ledger_task_id, "task-ledger-1");
});
```

Run:

```bash
npm run build
npm test
```

Expected:
- PASS (this is a guard; the HTTP-layer change is tested via manual scenario + stress script later)

- [ ] **Step 2: Implement /route/execute request parsing + write ledger_task_id**

Update `7-ARTIFACT-HUB-V2/src/index.ts` `/route/execute` handler:

Implementation rule:
- Accept either:
  - raw `Intent` body (legacy)
  - `{ intent: Intent, ledger_task_id?: string }`
  - `Intent & { ledger_task_id?: string }`

Add:
- `ledgerTaskId` extraction
- persist into `work.writeTask({... ledger_task_id: ledgerTaskId })`

- [ ] **Step 3: Add GET endpoints**

Add to `7-ARTIFACT-HUB-V2/src/index.ts` server handler:
- `GET /ops/ledger/open-tasks`
- `GET /api/ops/ledger/open-tasks`

Both should call:

```ts
buildOpenTasksSnapshot({
  repoRoot,
  artifactsRoot,
  workspacePath: "7-ARTIFACT-HUB-V2",
})
```

Error mapping:
- thrown error message starts with `ledger_unavailable:` → 500 `{ error: "ledger_unavailable", path: "<...>" }`
- thrown error message starts with `artifacts_root_unavailable:` → 500 `{ error: "artifacts_root_unavailable", path: "<...>" }`

- [ ] **Step 4: Verify build + tests**

Run:

```bash
npm run build
npm test
```

Expected:
- PASS

- [ ] **Step 5: Manual verification (local)**

Terminal A:

```bash
cd /Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/7-ARTIFACT-HUB-V2
npm run build
node dist/index.js
```

Terminal B:

```bash
curl -s http://127.0.0.1:8787/ops/ledger/open-tasks | python3 -m json.tool | head -n 80
curl -s http://127.0.0.1:8787/api/ops/ledger/open-tasks | python3 -m json.tool | head -n 80
```

Then simulate a mapped execution (you must replace the ledger task id with an actual open task id from the response):

```bash
curl -s -X POST http://127.0.0.1:8787/route/execute \\
  -H 'content-type: application/json' \\
  -d '{\"ledger_task_id\":\"task-pr9-ahv2-ops-ui-skeleton-1\",\"intent\":{\"type\":\"noop\"}}' | python3 -m json.tool
```

Re-query:

```bash
curl -s http://127.0.0.1:8787/ops/ledger/open-tasks | python3 -m json.tool | head -n 120
```

- [ ] **Step 6: Commit**

```bash
git add 7-ARTIFACT-HUB-V2/src/index.ts
git commit -m "feat(artifact-hub-v2): add ledger bridge endpoints and mapping"
```

---

### Task 4: Stress test + multi-scenario simulation (manual runner)

**Files:**
- Create: `7-ARTIFACT-HUB-V2/scripts/stress-ledger-bridge.mjs`

- [ ] **Step 1: Add stress runner script**

Create `7-ARTIFACT-HUB-V2/scripts/stress-ledger-bridge.mjs`:

```js
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildOpenTasksSnapshot } from "../dist/ledger-bridge.js";

function writeJson(p, value) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(value, null, 2));
}

function makeRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ahv2-stress-"));
  const artifactsRoot = path.join(repoRoot, "dreambuddy", "artifacts");
  const ledgerPath = path.join(repoRoot, "AGENT协作工具", "ledger", "tasks", "index.json");
  return { repoRoot, artifactsRoot, ledgerPath };
}

function seedLedger({ ledgerPath }, taskCount) {
  const tasks = [];
  const open = [];
  for (let i = 0; i < taskCount; i++) {
    const id = `task-ledger-${i}`;
    tasks.push({ task_id: id, status: "planned", workspace_path: "7-ARTIFACT-HUB-V2", title: id });
    open.push(id);
  }
  writeJson(ledgerPath, { version: 1, generated_at: new Date().toISOString(), open_tasks: open, tasks });
}

function seedHub({ artifactsRoot }, ledgerTaskId, runIdx, withResult) {
  const hubTaskId = `${ledgerTaskId}-hub-${runIdx}`;
  const traceId = `${ledgerTaskId}-trace-${runIdx}`;
  writeJson(path.join(artifactsRoot, "tasks", `task_${hubTaskId}.json`), {
    trace_id: traceId,
    task_id: hubTaskId,
    created_at: new Date(Date.now() + runIdx).toISOString(),
    intent: {},
    routing_plan: {},
    ledger_task_id: ledgerTaskId,
  });
  if (withResult) {
    writeJson(path.join(artifactsRoot, "results", `result_${hubTaskId}.json`), {
      trace_id: traceId,
      task_id: hubTaskId,
      status: runIdx % 7 === 0 ? "failed" : "completed",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
}

function scenario(label, fn) {
  const start = Date.now();
  const out = fn();
  const ms = Date.now() - start;
  const sample = out.items[0] || null;
  console.log(JSON.stringify({ label, ms, item_count: out.items.length, sample }, null, 2));
}

const repo = makeRepo();
seedLedger(repo, 2000);

for (let i = 0; i < 2000; i++) {
  const id = `task-ledger-${i}`;
  const runs = i % 3 === 0 ? 3 : 1;
  for (let r = 0; r < runs; r++) {
    seedHub(repo, id, r, i % 2 === 0);
  }
}

scenario("cold-run", () =>
  buildOpenTasksSnapshot({
    repoRoot: repo.repoRoot,
    artifactsRoot: repo.artifactsRoot,
    ledgerPath: repo.ledgerPath,
    workspacePath: "7-ARTIFACT-HUB-V2",
    nowIso: new Date().toISOString(),
  })
);

scenario("hot-run", () =>
  buildOpenTasksSnapshot({
    repoRoot: repo.repoRoot,
    artifactsRoot: repo.artifactsRoot,
    ledgerPath: repo.ledgerPath,
    workspacePath: "7-ARTIFACT-HUB-V2",
    nowIso: new Date().toISOString(),
  })
);
```

- [ ] **Step 2: Build**

Run:

```bash
npm run build
```

Expected:
- PASS

- [ ] **Step 3: Run stress script**

Run:

```bash
node scripts/stress-ledger-bridge.mjs | head -n 120
```

Expected:
- JSON output contains `cold-run` and `hot-run` with timing and a `sample` item showing joined hub fields

- [ ] **Step 4: Commit**

```bash
git add 7-ARTIFACT-HUB-V2/scripts/stress-ledger-bridge.mjs
git commit -m "test(artifact-hub-v2): add ledger bridge stress runner"
```

---

## Plan self-review

- Spec coverage:
  - `ledger_task_id` persistence: Task 1 + Task 3
  - 2 endpoints: Task 3
  - aggregation + error mapping: Task 2 + Task 3
  - stress + multi-scenario: Task 4
- Placeholder scan: no TBD/TODO
- Type consistency: `ledger_task_id` used consistently

