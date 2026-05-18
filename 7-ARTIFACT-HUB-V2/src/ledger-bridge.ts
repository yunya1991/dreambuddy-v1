import fs from "node:fs";
import path from "node:path";

export interface LedgerTaskIndex {
  version?: number;
  generated_at?: string;
  open_tasks?: string[];
  tasks?: LedgerTask[];
}

export interface LedgerTask {
  task_id: string;
  title?: string;
  status?: string;
  workspace_path?: string;
  owner_agent?: string;
  validator_agent?: string;
  governance_agent?: string;
  next_required_action?: string;
}

export interface HubTaskRef {
  task_id: string;
  trace_id: string;
  created_at: string;
  ledger_task_id?: string;
}

export interface HubResultRef {
  task_id: string;
  trace_id: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface LedgerOpenTaskRow {
  ledger_task: LedgerTask;
  hub_task: HubTaskRef | null;
  hub_result: HubResultRef | null;
}

export interface LedgerOpenTasksSnapshot {
  generated_at: string;
  workspace_path: string;
  open_tasks_total: number;
  items: LedgerOpenTaskRow[];
}

export function getLedgerOpenTasksSnapshot(params: {
  repoRoot: string;
  artifactsRoot: string;
  workspacePath?: string;
  limit?: number;
}): LedgerOpenTasksSnapshot {
  const workspacePath = (params.workspacePath || "7-ARTIFACT-HUB-V2").trim();
  const limit = Math.max(0, params.limit ?? 200);
  const ledgerIndexPath = path.join(params.repoRoot, "AGENT协作工具", "ledger", "tasks", "index.json");

  const ledgerIndex = readJsonFile<LedgerTaskIndex>(ledgerIndexPath, { open_tasks: [], tasks: [] });
  const ledgerTasks = (ledgerIndex.tasks || []).filter((t) => (t.workspace_path || "").trim() === workspacePath);

  const openSet = computeOpenTaskIdSet(ledgerIndex, ledgerTasks);
  const openLedgerTasks = ledgerTasks
    .filter((t) => openSet.has(t.task_id))
    .slice(0, limit);

  const latestHubTaskByLedger = loadLatestHubTasksByLedgerTaskId(params.artifactsRoot);
  const hubResultsByTaskId = loadHubResultsByTaskId(params.artifactsRoot);

  const items: LedgerOpenTaskRow[] = openLedgerTasks.map((t) => {
    const hubTask = latestHubTaskByLedger.get(t.task_id) ?? null;
    const hubResult = hubTask ? hubResultsByTaskId.get(hubTask.task_id) ?? null : null;
    return { ledger_task: t, hub_task: hubTask, hub_result: hubResult };
  });

  return {
    generated_at: new Date().toISOString(),
    workspace_path: workspacePath,
    open_tasks_total: items.length,
    items
  };
}

function computeOpenTaskIdSet(index: LedgerTaskIndex, tasks: LedgerTask[]): Set<string> {
  const explicit = (index.open_tasks || []).map((x) => String(x || "").trim()).filter((x) => x.length > 0);
  if (explicit.length > 0) return new Set(explicit);

  const openStatuses = new Set(["planned", "open", "accepted", "rework", "blocked"]);
  return new Set(
    tasks
      .map((t) => ({ id: t.task_id, status: (t.status || "").trim().toLowerCase() }))
      .filter((t) => openStatuses.has(t.status))
      .map((t) => t.id)
  );
}

function loadLatestHubTasksByLedgerTaskId(artifactsRoot: string): Map<string, HubTaskRef> {
  const tasksDir = path.join(artifactsRoot, "tasks");
  if (!fs.existsSync(tasksDir)) return new Map();

  const byLedger = new Map<string, HubTaskRef>();
  const files = fs.readdirSync(tasksDir).filter((f) => f.startsWith("task_") && f.endsWith(".json"));
  for (const f of files) {
    const p = path.join(tasksDir, f);
    const parsed = readJsonFile<Record<string, unknown> | null>(p, null);
    if (!parsed || typeof parsed !== "object") continue;

    const ledgerTaskId = typeof parsed.ledger_task_id === "string" ? parsed.ledger_task_id.trim() : "";
    if (!ledgerTaskId) continue;

    const taskId = typeof parsed.task_id === "string" ? parsed.task_id : "";
    const traceId = typeof parsed.trace_id === "string" ? parsed.trace_id : "";
    const createdAt = typeof parsed.created_at === "string" ? parsed.created_at : "";
    if (!taskId || !traceId || !createdAt) continue;

    const candidate: HubTaskRef = { task_id: taskId, trace_id: traceId, created_at: createdAt, ledger_task_id: ledgerTaskId };
    const current = byLedger.get(ledgerTaskId);
    if (!current || compareIso(candidate.created_at, current.created_at) > 0) {
      byLedger.set(ledgerTaskId, candidate);
    }
  }

  return byLedger;
}

function loadHubResultsByTaskId(artifactsRoot: string): Map<string, HubResultRef> {
  const resultsDir = path.join(artifactsRoot, "results");
  if (!fs.existsSync(resultsDir)) return new Map();

  const byTaskId = new Map<string, HubResultRef>();
  const files = fs.readdirSync(resultsDir).filter((f) => f.startsWith("result_") && f.endsWith(".json"));
  for (const f of files) {
    const p = path.join(resultsDir, f);
    const parsed = readJsonFile<Record<string, unknown> | null>(p, null);
    if (!parsed || typeof parsed !== "object") continue;

    const taskId = typeof parsed.task_id === "string" ? parsed.task_id : "";
    const traceId = typeof parsed.trace_id === "string" ? parsed.trace_id : "";
    const status = typeof parsed.status === "string" ? parsed.status : "";
    if (!taskId || !traceId || !status) continue;

    const createdAt = typeof parsed.created_at === "string" ? parsed.created_at : undefined;
    const updatedAt = typeof parsed.updated_at === "string" ? parsed.updated_at : undefined;

    const candidate: HubResultRef = { task_id: taskId, trace_id: traceId, status, created_at: createdAt, updated_at: updatedAt };
    const current = byTaskId.get(taskId);
    if (!current) {
      byTaskId.set(taskId, candidate);
      continue;
    }

    const candidateTs = candidate.updated_at || candidate.created_at || "";
    const currentTs = current.updated_at || current.created_at || "";
    if (compareIso(candidateTs, currentTs) > 0) byTaskId.set(taskId, candidate);
  }

  return byTaskId;
}

function compareIso(a: string, b: string): number {
  const at = Date.parse(a);
  const bt = Date.parse(b);
  if (!Number.isFinite(at) && !Number.isFinite(bt)) return 0;
  if (!Number.isFinite(at)) return -1;
  if (!Number.isFinite(bt)) return 1;
  return at - bt;
}

function readJsonFile<T>(p: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(p, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

