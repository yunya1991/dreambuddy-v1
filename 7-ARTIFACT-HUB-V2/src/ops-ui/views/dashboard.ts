import { HealthViewModel, toHealthViewModel } from "../adapters/healthAdapter";
import { TraceViewModel, toTraceViewModel } from "../adapters/traceAdapter";
import { WorkflowViewModel, toWorkflowViewModel } from "../adapters/workflowAdapter";
import { mockHealth } from "../adapters/mock/health.mock";
import { mockTrace } from "../adapters/mock/trace.mock";
import { mockWorkflow } from "../adapters/mock/workflow.mock";

function statusBadge(status: string): string {
  const colors: Record<string, string> = {
    ok: "#22c55e", running: "#3b82f6", completed: "#22c55e",
    failed: "#ef4444", degraded: "#f59e0b", error: "#ef4444",
    pending: "#6b7280", unknown: "#6b7280",
  };
  const color = colors[status] ?? "#6b7280";
  return `<span style="background:${color};color:#fff;padding:2px 8px;border-radius:4px;font-size:12px">${status}</span>`;
}

function healthCard(h: HealthViewModel): string {
  const deps = h.dependencyList
    .map((d) => `<tr><td style="padding:4px 8px">${d.name}</td><td>${statusBadge(d.status)}</td></tr>`)
    .join("");
  return `
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px">
    <h3 style="margin:0 0 8px">Health — ${h.service} ${statusBadge(h.status)}</h3>
    <p style="color:#6b7280;font-size:12px;margin:0 0 8px">${h.timestamp}</p>
    <table style="border-collapse:collapse;width:100%"><tbody>${deps}</tbody></table>
    <p style="font-size:11px;color:#9ca3af;margin:8px 0 0">Source: health-summary.v1 (L1 mock)</p>
  </div>`;
}

function traceCard(t: TraceViewModel): string {
  const duration = t.durationMs != null ? `${(t.durationMs / 1000).toFixed(1)}s` : "—";
  return `
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px">
    <h3 style="margin:0 0 8px">Trace — ${t.traceId} ${statusBadge(t.status)}</h3>
    <p style="margin:4px 0;font-size:13px">Workflow: <code>${t.workflowId}</code> (${t.workflowType})</p>
    <p style="margin:4px 0;font-size:13px">Department: ${t.department} &nbsp;|&nbsp; Duration: ${duration}</p>
    <p style="font-size:11px;color:#9ca3af;margin:8px 0 0">Source: trace-summary.v1 (L1 mock)</p>
  </div>`;
}

function workflowCard(w: WorkflowViewModel): string {
  return `
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px">
    <h3 style="margin:0 0 8px">Workflow — ${w.workflowId} ${statusBadge(w.status)}</h3>
    <p style="margin:4px 0;font-size:13px">Type: ${w.workflowType} &nbsp;|&nbsp; Phase: <code>${w.chainPhase}</code></p>
    <p style="margin:4px 0;font-size:13px">Latest Trace: ${w.latestTraceId ?? "—"}</p>
    <p style="font-size:11px;color:#9ca3af;margin:8px 0 0">Source: workflow-summary.v1 (L1 mock)</p>
  </div>`;
}

export function renderDashboard(): string {
  const health = toHealthViewModel(mockHealth);
  const trace = toTraceViewModel(mockTrace);
  const workflow = toWorkflowViewModel(mockWorkflow);

  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Ops UI — Governance Dashboard</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #f9fafb; color: #111827; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .subtitle { color: #6b7280; font-size: 13px; margin: 0 0 24px; }
    .banner { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 8px 12px; font-size: 12px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>Ops UI — Governance Dashboard</h1>
  <p class="subtitle">7-ARTIFACT-HUB-V2 治理控制台 · 数据来源：L1 冻结契约 mock</p>
  <div class="banner">⚠️ 当前为 mock 数据模式，所有数据来自契约 example，非真实后端</div>
  ${healthCard(health)}
  ${traceCard(trace)}
  ${workflowCard(workflow)}
</body>
</html>`;
}
