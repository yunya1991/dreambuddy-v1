import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer, type IncomingMessage } from "node:http";
import express from "express";
import { buildOpsRouter } from "./routes/index.js";
import { renderOpsHtml } from "./html.js";
import { getQueueSnapshot } from "./ops-api.js";

function listen(server: ReturnType<typeof createServer>, host = "127.0.0.1"): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("failed_to_listen"));
      const url = `http://${host}:${address.port}`;
      resolve({
        url,
        close: () =>
          new Promise<void>((r) => {
            server.close(() => r());
          })
      });
    });
  });
}

function createOpsServer(): ReturnType<typeof createServer> {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use(buildOpsRouter());
  return createServer(app);
}

function writeJson(p: string, body: unknown) {
  fs.writeFileSync(p, JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks).toString("utf-8");
}

test("getQueueSnapshot counts tasks/results and pending ids", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-hub-ops-ui-"));
  const tasks = path.join(root, "tasks");
  const results = path.join(root, "results");
  fs.mkdirSync(tasks, { recursive: true });
  fs.mkdirSync(results, { recursive: true });

  writeJson(path.join(tasks, "task_1.json"), { task_id: "1" });
  writeJson(path.join(tasks, "task_2.json"), { task_id: "2" });
  writeJson(path.join(results, "result_1.json"), { task_id: "1" });

  const prev = process.env.ARTIFACTS_ROOT;
  process.env.ARTIFACTS_ROOT = root;
  try {
    const snapshot = getQueueSnapshot({ limit: 10 });
    assert.equal(snapshot.tasks_total, 2);
    assert.equal(snapshot.results_total, 1);
    assert.equal(snapshot.pending_total, 1);
    assert.deepEqual(snapshot.pending_ids, ["2"]);
  } finally {
    process.env.ARTIFACTS_ROOT = prev;
  }
});

test("renderOpsHtml includes route sandbox ids", () => {
  const html = renderOpsHtml({ host: "127.0.0.1", port: 1 });
  assert.ok(html.includes("Route Sandbox"));
  assert.ok(html.includes('id="intentJson"'));
  assert.ok(html.includes('id="decideBtn"'));
  assert.ok(html.includes('id="executeBtn"'));
  assert.ok(html.includes('id="dagNodesJson"'));
  assert.ok(html.includes('id="dagEdgesJson"'));
  assert.ok(html.includes('id="traceJson"'));
});

test("ops-ui exposes ui map page with visual architecture sections", async () => {
  const opsListener = await listen(createOpsServer());
  try {
    const res = await fetch(new URL("/ui-map", opsListener.url));
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("Artifact Hub V2"));
    assert.ok(html.includes("Feed Content Portal"));
    assert.ok(html.includes("Ops Governance Console"));
    assert.ok(html.includes('id="stage-feed"'));
    assert.ok(html.includes('id="stage-ops"'));
    assert.ok(html.includes('id="stage-data"'));
  } finally {
    await opsListener.close();
  }
});

test("ops-ui exposes /api/ops/queues and /api/ops/health", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-hub-ops-ui-"));
  fs.mkdirSync(path.join(root, "tasks"), { recursive: true });
  fs.mkdirSync(path.join(root, "results"), { recursive: true });
  writeJson(path.join(root, "tasks", "task_a.json"), { task_id: "a" });

  const hub = createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: true, service: "hub" }));
      return;
    }
    res.statusCode = 404;
    res.end("not_found");
  });

  const gateway = createServer((req, res) => {
    if (req.method === "GET" && (req.url || "").startsWith("/api/monitor/stats")) {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ success: true, data: { stats: { ok: true } } }));
      return;
    }
    res.statusCode = 404;
    res.end("not_found");
  });

  const hubListener = await listen(hub);
  const gatewayListener = await listen(gateway);
  const prevHubUrl = process.env.HUB_URL;
  const prevGatewayUrl = process.env.GATEWAY_URL;
  const prevArtifactsRoot = process.env.ARTIFACTS_ROOT;
  process.env.HUB_URL = hubListener.url;
  process.env.GATEWAY_URL = gatewayListener.url;
  process.env.ARTIFACTS_ROOT = root;

  const opsListener = await listen(createOpsServer());
  try {
    const queuesRes = await fetch(new URL("/api/ops/queues", opsListener.url));
    assert.equal(queuesRes.status, 200);
    const queuesJson = (await queuesRes.json()) as { tasks_total: number; pending_total: number };
    assert.equal(queuesJson.tasks_total, 1);
    assert.equal(queuesJson.pending_total, 1);

    const healthRes = await fetch(new URL("/api/ops/health", opsListener.url));
    assert.equal(healthRes.status, 200);
    const healthJson = (await healthRes.json()) as { ok: boolean; hub: unknown; gateway: unknown; queues: unknown };
    assert.equal(healthJson.ok, true);
    assert.ok(healthJson.hub);
    assert.ok(healthJson.gateway);
    assert.ok(healthJson.queues);
  } finally {
    process.env.HUB_URL = prevHubUrl;
    process.env.GATEWAY_URL = prevGatewayUrl;
    process.env.ARTIFACTS_ROOT = prevArtifactsRoot;
    await opsListener.close();
    await hubListener.close();
    await gatewayListener.close();
  }
});

test("ops-ui proxies route decide/execute and traces to hub", async () => {
  const intent = { text: "hello" };
  const decidedPlan = {
    trace_id: "trace_decide",
    mode: "DIRECT_RETURN",
    reason: { ok: true },
    dag: { nodes: [{ node_id: "n1" }], edges: [{ from: "n1", to: "n2" }] }
  };

  const hub = createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://hub.local");
    if (req.method === "POST" && url.pathname === "/route/decide") {
      const raw = await readBody(req);
      assert.deepEqual(JSON.parse(raw), intent);
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify(decidedPlan));
      return;
    }

    if (req.method === "POST" && url.pathname === "/route/execute") {
      const raw = await readBody(req);
      assert.deepEqual(JSON.parse(raw), intent);
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ trace_id: "trace_exec", task_id: "task_1" }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/traces/trace_exec") {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ trace_id: "trace_exec", decision: { decision: decidedPlan }, events: [{ type: "done" }] }));
      return;
    }

    res.statusCode = 404;
    res.end("not_found");
  });

  const hubListener = await listen(hub);
  const prevHubUrl = process.env.HUB_URL;
  process.env.HUB_URL = hubListener.url;

  const opsListener = await listen(createOpsServer());
  try {
    const decideRes = await fetch(new URL("/api/ops/route/decide", opsListener.url), {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(intent)
    });
    assert.equal(decideRes.status, 200);
    assert.deepEqual(await decideRes.json(), decidedPlan);

    const executeRes = await fetch(new URL("/api/ops/route/execute", opsListener.url), {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(intent)
    });
    assert.equal(executeRes.status, 200);
    assert.deepEqual(await executeRes.json(), { trace_id: "trace_exec", task_id: "task_1" });

    const traceRes = await fetch(new URL("/api/ops/traces/trace_exec", opsListener.url));
    assert.equal(traceRes.status, 200);
    const traceJson = (await traceRes.json()) as { trace_id: string; decision: unknown; events: unknown };
    assert.equal(traceJson.trace_id, "trace_exec");
    assert.ok(traceJson.decision);
    assert.ok(traceJson.events);
  } finally {
    process.env.HUB_URL = prevHubUrl;
    await opsListener.close();
    await hubListener.close();
  }
});
test("ops-ui /api/ops/health includes typed hub_health HealthViewModel when hub returns valid contract", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-hub-health-adapter-"));
  fs.mkdirSync(path.join(root, "tasks"), { recursive: true });
  fs.mkdirSync(path.join(root, "results"), { recursive: true });

  const hubHealthPayload = {
    service: "artifact-hub",
    status: "ok",
    timestamp: new Date().toISOString(),
    dependencies: {
      artifact_hub: "ok",
      gateway: "ok",
      meta_db: "ok",
    },
  };

  const hub = createServer((_req, res) => {
    res.statusCode = 200;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(hubHealthPayload));
  });

  const gateway = createServer((_req, res) => {
    res.statusCode = 200;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: true }));
  });

  const hubListener = await listen(hub);
  const gatewayListener = await listen(gateway);
  const prevHubUrl = process.env.HUB_URL;
  const prevGatewayUrl = process.env.GATEWAY_URL;
  const prevArtifactsRoot = process.env.ARTIFACTS_ROOT;
  process.env.HUB_URL = hubListener.url;
  process.env.GATEWAY_URL = gatewayListener.url;
  process.env.ARTIFACTS_ROOT = root;

  const opsListener = await listen(createOpsServer());
  try {
    const res = await fetch(new URL("/api/ops/health", opsListener.url));
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      ok: boolean;
      hub_health: { service: string; status: string; dependencyList: Array<{ name: string; status: string }> } | null;
    };
    assert.equal(body.ok, true);
    assert.ok(body.hub_health, "hub_health should be present");
    assert.equal(body.hub_health!.service, "artifact-hub");
    assert.equal(body.hub_health!.status, "ok");
    assert.ok(Array.isArray(body.hub_health!.dependencyList));
    assert.equal(body.hub_health!.dependencyList.length, 3);
  } finally {
    process.env.HUB_URL = prevHubUrl;
    process.env.GATEWAY_URL = prevGatewayUrl;
    process.env.ARTIFACTS_ROOT = prevArtifactsRoot;
    await opsListener.close();
    await hubListener.close();
    await gatewayListener.close();
  }
});

test("ops-ui /api/ops/strategy-library returns strategy list via HTTP", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-hub-strategy-http-"));
  const strategyDir = path.join(root, "strategy");
  fs.mkdirSync(strategyDir, { recursive: true });
  fs.writeFileSync(
    path.join(strategyDir, "alpha.md"),
    ["---", "title: Alpha Strategy", "---", "", "body"].join("\n"),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(strategyDir, "beta.md"),
    ["# Beta Strategy", "", "body"].join("\n"),
    "utf-8"
  );

  const prevArtifactsRoot = process.env.ARTIFACTS_ROOT;
  process.env.ARTIFACTS_ROOT = root;
  const opsListener = await listen(createOpsServer());
  try {
    const res = await fetch(new URL("/api/ops/strategy-library", opsListener.url));
    assert.equal(res.status, 200);
    const body = (await res.json()) as { total: number; items: Array<{ id: string; title: string }> };
    assert.equal(body.total, 2);
    assert.equal(body.items.length, 2);
    const titles = body.items.map((x) => x.title).sort();
    assert.deepEqual(titles, ["Alpha Strategy", "Beta Strategy"]);
  } finally {
    process.env.ARTIFACTS_ROOT = prevArtifactsRoot;
    await opsListener.close();
  }
});

test("ops-ui /api/ops/strategy-library/file returns doc content by id", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-hub-strategy-file-http-"));
  const strategyDir = path.join(root, "strategy");
  fs.mkdirSync(strategyDir, { recursive: true });
  fs.writeFileSync(
    path.join(strategyDir, "gamma.md"),
    ["---", "title: Gamma Strategy", "---", "", "# Gamma", "Content here."].join("\n"),
    "utf-8"
  );

  const prevArtifactsRoot = process.env.ARTIFACTS_ROOT;
  process.env.ARTIFACTS_ROOT = root;
  const opsListener = await listen(createOpsServer());
  try {
    const res = await fetch(new URL("/api/ops/strategy-library/file?id=gamma.md", opsListener.url));
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ok: boolean; doc: { id: string; content: string } };
    assert.equal(body.ok, true);
    assert.equal(body.doc.id, "gamma.md");
    assert.ok(body.doc.content.includes("Gamma"));

    const missingRes = await fetch(new URL("/api/ops/strategy-library/file?id=notexist.md", opsListener.url));
    assert.equal(missingRes.status, 404);

    const noIdRes = await fetch(new URL("/api/ops/strategy-library/file", opsListener.url));
    assert.equal(noIdRes.status, 400);
  } finally {
    process.env.ARTIFACTS_ROOT = prevArtifactsRoot;
    await opsListener.close();
  }
});
