import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import path from "node:path";
import crypto from "node:crypto";
import { loadConfig, resolveRepoRoot } from "./config.js";
import { ArtifactStore } from "./artifact-store.js";
import { EventBus } from "./event-bus.js";
import { readJson, sendJson, methodNotAllowed, notFound } from "./http-utils.js";
import { MetaStore } from "./meta-store.js";
import { RouterEngine } from "./router-engine.js";
import { WorkOrderManager } from "./work-order.js";
import type { Intent } from "./types.js";

const repoRoot = resolveRepoRoot();
const config = loadConfig(repoRoot);
const artifactsRoot = path.join(repoRoot, config.paths.artifacts_root);
const metaRoot = path.join(repoRoot, config.paths.meta_root);

const store = new ArtifactStore(artifactsRoot);
const meta = new MetaStore(metaRoot);
const router = new RouterEngine();
const events = new EventBus();
const work = new WorkOrderManager(artifactsRoot);

work.pollResults((result, filePath) => {
  meta.addEvent(
    result.trace_id,
    `e_result_${crypto.randomUUID()}`,
    "result.detected",
    { file: filePath, result },
    Date.now()
  );
  events.publish(result.trace_id, {
    type: "result.detected",
    payload: { file: filePath, result },
    ts: Date.now()
  });
});

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return sendJson(res, 200, { ok: true, service: "artifact-hub-v2" });
  }

  if (url.pathname === "/route/decide") {
    if (req.method !== "POST") return methodNotAllowed(res);

    const intent = await readJson<Intent>(req);
    const artifacts = store.getArtifactsIndex();
    const plan = router.decide(intent, artifacts);

    meta.addEvent(plan.trace_id, `e_trace_${crypto.randomUUID()}`, "trace.created", { trace_id: plan.trace_id });
    meta.addEvent(plan.trace_id, `e_route_${crypto.randomUUID()}`, "route.decided", { mode: plan.mode });
    meta.addRouteDecision(plan.trace_id, `d_${crypto.randomUUID()}`, intent, plan, "v0");
    events.publish(plan.trace_id, { type: "route.decided", payload: plan, ts: Date.now() });

    return sendJson(res, 200, plan);
  }

  if (url.pathname === "/route/execute") {
    if (req.method !== "POST") return methodNotAllowed(res);

    const body = await readJson<unknown>(req);
    const envelope = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    const intent = (envelope && envelope.intent ? envelope.intent : body) as Intent;
    const ledgerTaskId =
      envelope && typeof envelope.ledger_task_id === "string" ? envelope.ledger_task_id.trim() : undefined;
    const artifacts = store.getArtifactsIndex();
    const plan = router.decide(intent, artifacts);
    const taskId = crypto.randomUUID();

    meta.addEvent(plan.trace_id, `e_trace_${crypto.randomUUID()}`, "trace.created", { trace_id: plan.trace_id });
    meta.addEvent(
      plan.trace_id,
      `e_work_${crypto.randomUUID()}`,
      "work_order.written",
      { task_id: taskId },
      Date.now()
    );
    meta.addRouteDecision(plan.trace_id, `d_${crypto.randomUUID()}`, intent, plan, "v0");

    const taskFilePath = work.writeTask({
      trace_id: plan.trace_id,
      task_id: taskId,
      created_at: new Date().toISOString(),
      intent,
      routing_plan: plan,
      ledger_task_id: ledgerTaskId
    });

    events.publish(plan.trace_id, { type: "work_order.written", payload: { task_id: taskId }, ts: Date.now() });

    return sendJson(res, 200, { trace_id: plan.trace_id, task_id: taskId, task_file_path: taskFilePath });
  }

  if (url.pathname === "/ops/ledger/open-tasks" || url.pathname === "/api/ops/ledger/open-tasks") {
    if (req.method !== "GET") return methodNotAllowed(res);
    const limit = url.searchParams.get("limit")?.trim() || "200";
    const workspacePath = url.searchParams.get("workspace_path")?.trim() || "7-ARTIFACT-HUB-V2";
    const scriptPath = path.join(repoRoot, "AGENT协作工具", "github-actions", "ledger_workspace_bridge.py");

    try {
      const out = execFileSync("python3", ["-u", scriptPath, "--repo-root", repoRoot, "--workspace-path", workspacePath, "--limit", limit], {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"]
      });
      return sendJson(res, 200, JSON.parse(out) as unknown);
    } catch (e) {
      const err = e as any;
      const message = e instanceof Error ? e.message : String(e);
      const stdout = typeof err?.stdout === "string" ? err.stdout.slice(0, 2000) : "";
      const stderr = typeof err?.stderr === "string" ? err.stderr.slice(0, 2000) : "";
      return sendJson(res, 500, { ok: false, error: "ledger_workspace_bridge_failed", message, stdout, stderr });
    }
  }

  if (url.pathname === "/events/stream") {
    if (req.method !== "GET") return methodNotAllowed(res);
    const traceId = url.searchParams.get("traceId");
    if (!traceId) return sendJson(res, 400, { error: "missing_traceId" });

    res.statusCode = 200;
    res.setHeader("content-type", "text/event-stream; charset=utf-8");
    res.setHeader("cache-control", "no-cache");
    res.setHeader("connection", "keep-alive");
    res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    events.subscribe(traceId, res);
    return;
  }

  if (url.pathname.startsWith("/traces/")) {
    if (req.method !== "GET") return methodNotAllowed(res);
    const traceId = url.pathname.split("/").filter(Boolean)[1];
    if (!traceId) return notFound(res);
    const decision = meta.getLatestRouteDecision(traceId);
    const ev = meta.listEvents(traceId);
    return sendJson(res, 200, { trace_id: traceId, decision, events: ev });
  }

  return notFound(res);
});

server.listen(config.server.port, config.server.host);
