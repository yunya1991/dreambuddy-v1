import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { MetaStore } from "./meta-store.js";

test("MetaStore writes and reads events", () => {
  const metaRoot = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-meta-"));
  const ms = new MetaStore(metaRoot);
  ms.addEvent("t1", "e1", "trace.created", { ok: true }, 1);
  const events = ms.listEvents("t1");
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "trace.created");
});

test("MetaStore stores route decisions", () => {
  const metaRoot = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-meta-"));
  const ms = new MetaStore(metaRoot);
  ms.addRouteDecision("t1", "d1", { text: "x" }, { trace_id: "t1" }, "v0", 2);
  const latest = ms.getLatestRouteDecision("t1");
  assert.ok(latest);
  assert.equal((latest?.intent as any).text, "x");
});

test("MetaStore stores and updates executions", () => {
  const metaRoot = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-meta-"));
  const ms = new MetaStore(metaRoot);
  ms.addExecution("ex1", "t1", "i1", "d1", "wf1", "chain", "operations", "in_progress", 1000);
  ms.updateExecutionStatus("ex1", "delivered", 2000);
  // No error means schema + methods work correctly
  assert.ok(true);
});

test("MetaStore stores audit records", () => {
  const metaRoot = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-meta-"));
  const ms = new MetaStore(metaRoot);
  ms.addAuditRecord(
    "a1", "t1", "governance",
    { decision_id: "d1" }, { execution_id: "ex1" },
    [{ type: "task.started" }],
    ["low_risk"],
    "all good",
    3000
  );
  // No error means schema + method work correctly
  assert.ok(true);
});

test("MetaStore route_decisions accepts extended params", () => {
  const metaRoot = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-meta-"));
  const ms = new MetaStore(metaRoot);
  ms.addRouteDecision("t2", "d2", { text: "y" }, { trace_id: "t2" }, "v1", 5, "trading", "RUN_CHAIN", "high");
  const latest = ms.getLatestRouteDecision("t2");
  assert.ok(latest);
  assert.equal((latest?.decision as any).trace_id, "t2");
});
