import { createServer } from "node:http";
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
import { groupByWorkflowType, normalizeWorkflowType } from "./chain-workflow-guard.js";

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

    const intent = await readJson<Intent>(req);
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
      routing_plan: plan
    });

    events.publish(plan.trace_id, { type: "work_order.written", payload: { task_id: taskId }, ts: Date.now() });

    return sendJson(res, 200, { trace_id: plan.trace_id, task_id: taskId, task_file_path: taskFilePath });
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


  if (url.pathname === "/chain/artifacts") {
    if (req.method !== "GET") return methodNotAllowed(res);
    const workflowTypeParam = url.searchParams.get("workflow_type") ?? undefined;
    const allArtifacts = store.getArtifactsIndex();
    const groups = groupByWorkflowType(
      allArtifacts.map(a => ({
        artifact_id: a.id,
        title: a.title,
        department: a.department,
        category: a.id.split("/")[0] ?? "",
        type: a.type,
        chain_phase: a.chain_phase,
        workflow_id: "",
        workflow_type: normalizeWorkflowType(a.workflow_type),
        trace_id: "",
        status: a.status,
        relative_path: a.url,
        created_at: a.date,
      }))
    );
    if (workflowTypeParam === "legacy_chain" || workflowTypeParam === "trading_v2") {
      return sendJson(res, 200, {
        workflow_type: workflowTypeParam,
        items: groups[workflowTypeParam],
        total: groups[workflowTypeParam].length,
      });
    }
    return sendJson(res, 200, {
      legacy_chain: groups.legacy_chain,
      trading_v2: groups.trading_v2,
      total: allArtifacts.length,
    });
  }

  if (url.pathname === "/chain/reviews") {
    if (req.method !== "GET") return methodNotAllowed(res);
    const traceId = url.searchParams.get("traceId");
    if (!traceId) return sendJson(res, 400, { error: "missing_traceId" });

    const reviews = meta.getExecutionReviews(traceId);
    return sendJson(res, 200, { trace_id: traceId, reviews });
  }

  return notFound(res);
});

server.listen(config.server.port, config.server.host);

