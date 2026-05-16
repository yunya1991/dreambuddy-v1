import { toHealthViewModel } from "../healthAdapter";
import { toTraceViewModel } from "../traceAdapter";
import { toWorkflowViewModel } from "../workflowAdapter";
import { mockHealth } from "./health.mock";
import { mockTrace } from "./trace.mock";
import { mockWorkflow } from "./workflow.mock";

// --- health ---

const health = toHealthViewModel(mockHealth);
console.assert(health.service === "artifact-hub-v2", "health.service");
console.assert(health.status === "ok", "health.status");
console.assert(health.dependencyList.length === 3, "health.dependencyList.length");
console.assert(
  health.dependencyList.find((d) => d.name === "gateway")?.status === "unknown",
  "health.gateway=unknown"
);

// --- trace: completed with duration ---

const trace = toTraceViewModel(mockTrace);
console.assert(trace.traceId === "trace_demo_001", "trace.traceId");
console.assert(trace.status === "completed", "trace.status");
console.assert(trace.durationMs === 150000, "trace.durationMs=150000ms");

// --- trace: running (finished_at = null) ---

const running = toTraceViewModel({ ...mockTrace, status: "running", finished_at: null });
console.assert(running.durationMs === null, "running trace durationMs=null");
console.assert(running.finishedAt === null, "running trace finishedAt=null");

// --- workflow: running ---

const wf = toWorkflowViewModel(mockWorkflow);
console.assert(wf.workflowId === "wf_demo_001", "wf.workflowId");
console.assert(wf.chainPhase === "A3", "wf.chainPhase=A3");
console.assert(wf.latestTraceId === "trace_demo_001", "wf.latestTraceId");

// --- workflow: no trace yet ---

const wfNoTrace = toWorkflowViewModel({ ...mockWorkflow, status: "pending", latest_trace_id: null });
console.assert(wfNoTrace.latestTraceId === null, "wf.latestTraceId=null");

console.log("All adapter tests passed.");
