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

