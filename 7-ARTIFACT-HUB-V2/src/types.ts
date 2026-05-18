export type ISODateString = string;

export type ArtifactStatus = "completed" | "processing" | "failed" | "unknown";

export type ArtifactType =
  | "knowledge"
  | "trading"
  | "dashboard_task"
  | "dashboard_result"
  | "unknown";

export type RouteMode =
  | "DIRECT_RETURN"
  | "INCREMENTAL_UPDATE"
  | "RUN_CHAIN"
  | "NEED_CONFIRMATION";

export type DagNodeStatus = "pending" | "running" | "success" | "error" | "skipped";

export type DagNodeType =
  | "intent_recognition"
  | "artifact_retrieval"
  | "artifact_scoring"
  | "policy_gate"
  | "work_order_emit"
  | "result_ingest"
  | "artifact_publish";

export interface ArtifactIndexItem {
  id: string;
  title: string;
  department: string;
  type: ArtifactType;
  date: ISODateString;
  status: ArtifactStatus;
  chain_phase: string;
  url: string;
  tags: string;
  excerpt?: string;
}

export interface DagNode {
  node_id: string;
  type: DagNodeType;
  status: DagNodeStatus;
  inputs: Array<{ kind: "artifact" | "text"; ref: string; summary?: string }>;
  outputs: Array<{ kind: "artifact" | "text"; ref: string; summary?: string }>;
  metrics?: { latency_ms?: number; cost_tokens?: number };
  evidence?: Array<{ kind: "rule" | "score" | "artifact"; detail: string }>;
}

export interface DagEdge {
  from: string;
  to: string;
}

export interface RoutingPlan {
  trace_id: string;
  mode: RouteMode;
  reason: Record<string, unknown>;
  dag: { nodes: DagNode[]; edges: DagEdge[] };
}

export interface Intent {
  text: string;
  domain?: string;
  task_type?: string;
  entities?: Record<string, unknown>;
  constraints?: Record<string, unknown>;
}

// Phase 1 governance object model — task-pr9-ahv2-object-model-align-1

export type ExecutionStatus = "in_progress" | "delivered" | "accepted" | "failed";

export type DecisionVerdict = "accepted" | "rework" | "block";

export interface Artifact {
  artifact_id: string;
  title: string;
  department: string;
  category: string;
  type: ArtifactType;
  chain_phase: string;
  workflow_id: string;
  workflow_type: string;
  trace_id: string;
  status: ArtifactStatus;
  relative_path: string;
  created_at: ISODateString;
}

export interface Decision {
  decision_id: string;
  trace_id: string;
  intent_id: string;
  department: string;
  policy_version: string;
  selected_route: string;
  reason: string;
  evidence_refs: string[];
  decision_level: string;
  created_at: ISODateString;
}

export interface Execution {
  execution_id: string;
  trace_id: string;
  intent_id: string;
  decision_id: string;
  workflow_id: string;
  workflow_type: string;
  department: string;
  status: ExecutionStatus;
  started_at: ISODateString;
  finished_at?: ISODateString;
}

export interface AuditRecord {
  audit_id: string;
  trace_id: string;
  department: string;
  decision_snapshot: unknown;
  execution_snapshot: unknown;
  events: unknown[];
  risk_flags?: string[];
  review_notes?: string;
  created_at: ISODateString;
}
