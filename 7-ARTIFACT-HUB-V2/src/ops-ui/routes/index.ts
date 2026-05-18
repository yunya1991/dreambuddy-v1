import express from "express";
import type { Request, Response } from "express";
import { renderHealth } from "../views/health.js";
import { renderOpsHtml } from "../html.js";
import { getQueueSnapshot } from "../ops-api.js";
import { listStrategies, readStrategy } from "../strategy-library.js";
import { renderUiMapHtml } from "../ui-map.js";

function sendHtml(res: Response, statusCode: number, html: string) {
  res.setHeader("content-type", "text/html; charset=utf-8");
  return res.status(statusCode).send(html);
}

function resolveHubBaseUrl(): string {
  const raw = process.env.HUB_URL?.trim();
  return raw && raw.length > 0 ? raw : "http://127.0.0.1:8787";
}

function resolveGatewayBaseUrl(): string {
  const raw = process.env.GATEWAY_URL?.trim();
  return raw && raw.length > 0 ? raw : "http://127.0.0.1:3000";
}

function resolveOpsAdminToken(): string | null {
  const raw = process.env.OPS_ADMIN_TOKEN?.trim();
  return raw && raw.length > 0 ? raw : null;
}

async function safeFetchJson(url: string): Promise<{ ok: true; status: number; data: unknown } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    const text = await res.text();
    try {
      return { ok: true, status: res.status, data: JSON.parse(text) as unknown };
    } catch {
      return { ok: true, status: res.status, data: text };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function proxyJson(req: Request, res: Response, targetUrl: string) {
  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: { "content-type": "application/json; charset=utf-8", accept: "application/json" },
      body: req.method === "POST" ? JSON.stringify(req.body ?? {}) : undefined,
    });
    const text = await upstream.text();
    try {
      return res.status(upstream.status).json(JSON.parse(text) as unknown);
    } catch {
      return res.status(upstream.status).json({ ok: false, error: "invalid_json_from_upstream", raw: text });
    }
  } catch (e) {
    return res.status(502).json({
      ok: false,
      error: "upstream_fetch_failed",
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

export function buildOpsRouter(): express.Router {
  const router = express.Router();
  const hubBaseUrl = resolveHubBaseUrl();
  const gatewayBaseUrl = resolveGatewayBaseUrl();

  router.get("/health", (_req: Request, res: Response) => {
    const ts = new Date().toISOString();
    return res.json({
      service: "ops-ui",
      status: "ok",
      timestamp: ts,
      dependencies: { artifact_hub: "unknown", gateway: "unknown", meta_db: "unknown" },
    });
  });

  router.get("/api/ops/queues", (_req: Request, res: Response) => {
    return res.status(200).json(getQueueSnapshot());
  });

  router.get("/api/ops/strategy-library", (_req: Request, res: Response) => {
    return res.status(200).json(listStrategies());
  });

  router.get("/api/ops/strategy-library/file", (req: Request, res: Response) => {
    const id = req.query.id;
    if (typeof id !== "string" || id.trim().length === 0) {
      return res.status(400).json({ ok: false, error: "missing_id" });
    }
    try {
      return res.status(200).json({ ok: true, doc: readStrategy(id) });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return res.status(message === "strategy_not_found" ? 404 : 400).json({ ok: false, error: message });
    }
  });

  router.get("/api/ops/strategy-stats", async (_req: Request, res: Response) => {
    const token = resolveOpsAdminToken();
    if (!token) return res.status(500).json({ ok: false, error: "missing_ops_admin_token" });
    try {
      const upstream = await fetch(new URL("/api/admin/strategy-stats", gatewayBaseUrl).toString(), {
        headers: { accept: "application/json", "x-admin-token": token },
        signal: AbortSignal.timeout(1500),
      });
      const text = await upstream.text();
      try {
        return res.status(upstream.status).json(JSON.parse(text) as unknown);
      } catch {
        return res.status(upstream.status).json({ ok: false, error: "invalid_json_from_gateway", raw: text });
      }
    } catch (e) {
      return res.status(502).json({
        ok: false,
        error: "gateway_fetch_failed",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  });

  router.get("/api/ops/health", async (_req: Request, res: Response) => {
    const [hub, gateway] = await Promise.all([
      safeFetchJson(new URL("/health", hubBaseUrl).toString()),
      safeFetchJson(new URL("/api/monitor/stats", gatewayBaseUrl).toString()),
    ]);
    const queues = getQueueSnapshot();
    return res.status(200).json({
      ok: hub.ok && gateway.ok,
      generated_at: new Date().toISOString(),
      hub: { base_url: hubBaseUrl, result: hub },
      gateway: { base_url: gatewayBaseUrl, result: gateway },
      queues,
    });
  });

  router.post("/api/ops/route/decide", async (req: Request, res: Response) => {
    return proxyJson(req, res, new URL("/route/decide", hubBaseUrl).toString());
  });

  router.post("/api/ops/route/execute", async (req: Request, res: Response) => {
    return proxyJson(req, res, new URL("/route/execute", hubBaseUrl).toString());
  });

  router.get("/api/ops/traces/:traceId", async (req: Request, res: Response) => {
    const traceId = req.params.traceId;
    if (!traceId) return res.status(404).json({ ok: false, error: "missing_trace_id" });
    return proxyJson(req, res, new URL(`/traces/${encodeURIComponent(traceId)}`, hubBaseUrl).toString());
  });

  router.get("/", (_req: Request, res: Response) => {
    return sendHtml(res, 200, renderOpsHtml({ host: "127.0.0.1", port: Number(process.env.OPS_UI_PORT || 3457) }));
  });

  router.get("/ui-map", (_req: Request, res: Response) => {
    return sendHtml(res, 200, renderUiMapHtml({ host: "127.0.0.1", port: Number(process.env.OPS_UI_PORT || 3457) }));
  });

  router.get("/health.html", (_req: Request, res: Response) => {
    return sendHtml(res, 200, renderHealth());
  });

  return router;
}
