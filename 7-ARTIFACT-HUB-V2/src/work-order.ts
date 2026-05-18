import fs from "node:fs";
import path from "node:path";

export interface WorkOrder {
  trace_id: string;
  task_id: string;
  created_at: string;
  intent: unknown;
  routing_plan: unknown;
  ledger_task_id?: string;
}

export interface WorkResult {
  trace_id: string;
  task_id: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  payload?: unknown;
}

export class WorkOrderManager {
  private readonly seenResults = new Set<string>();

  constructor(private readonly artifactsRoot: string) {}

  ensureDirs(): void {
    fs.mkdirSync(path.join(this.artifactsRoot, "tasks"), { recursive: true });
    fs.mkdirSync(path.join(this.artifactsRoot, "results"), { recursive: true });
  }

  writeTask(order: WorkOrder): string {
    this.ensureDirs();
    const p = path.join(this.artifactsRoot, "tasks", `task_${order.task_id}.json`);
    fs.writeFileSync(p, JSON.stringify(order, null, 2));
    return p;
  }

  pollResults(onResult: (r: WorkResult, filePath: string) => void, intervalMs = 1000): () => void {
    this.ensureDirs();
    const dir = path.join(this.artifactsRoot, "results");
    const timer = setInterval(() => {
      let files: string[] = [];
      try {
        files = fs.readdirSync(dir).filter((f) => f.startsWith("result_") && f.endsWith(".json"));
      } catch {
        return;
      }

      for (const f of files) {
        const fp = path.join(dir, f);
        if (this.seenResults.has(fp)) continue;
        try {
          const parsed = JSON.parse(fs.readFileSync(fp, "utf-8")) as WorkResult;
          if (!parsed?.trace_id || !parsed?.task_id) {
            this.seenResults.add(fp);
            continue;
          }
          this.seenResults.add(fp);
          onResult(parsed, fp);
        } catch {
          continue;
        }
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }
}
