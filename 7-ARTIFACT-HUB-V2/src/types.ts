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
