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

