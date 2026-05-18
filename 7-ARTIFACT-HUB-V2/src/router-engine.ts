import crypto from "node:crypto";
import type { ArtifactIndexItem, Intent, RoutingPlan } from "./types.js";

export class RouterEngine {
  decide(intent: Intent, artifacts: ArtifactIndexItem[]): RoutingPlan {
    const traceId = crypto.randomUUID();
    const hasAny = artifacts.length > 0;
    const mode = hasAny ? "DIRECT_RETURN" : "RUN_CHAIN";

    const nodes = [
      {
        node_id: "n1",
        type: "intent_recognition",
        status: "success",
        inputs: [{ kind: "text", ref: "intent", summary: intent.text }],
        outputs: [{ kind: "text", ref: "intent_struct" }],
        evidence: [{ kind: "rule", detail: "v0: pass-through intent" }]
      },
      {
        node_id: "n2",
        type: "artifact_retrieval",
        status: "success",
        inputs: [{ kind: "text", ref: "intent_struct" }],
        outputs: [{ kind: "text", ref: "artifact_candidates", summary: String(artifacts.length) }],
        evidence: [{ kind: "rule", detail: "v0: load full index.json (no filtering yet)" }]
      },
      {
        node_id: "n3",
        type: "artifact_scoring",
        status: "success",
        inputs: [{ kind: "text", ref: "artifact_candidates" }],
        outputs: [{ kind: "text", ref: "artifact_score" }],
        evidence: [{ kind: "score", detail: `v0: hasAny=${String(hasAny)}` }]
      },
      {
        node_id: "n4",
        type: "policy_gate",
        status: "success",
        inputs: [{ kind: "text", ref: "artifact_score" }],
        outputs: [{ kind: "text", ref: "route_mode", summary: mode }],
        evidence: [{ kind: "rule", detail: "v0: DIRECT_RETURN if any artifact exists else RUN_CHAIN" }]
      }
    ] as any;

    return {
      trace_id: traceId,
      mode,
      reason: { has_any_artifact: hasAny, count: artifacts.length },
      dag: {
        nodes,
        edges: [
          { from: "n1", to: "n2" },
          { from: "n2", to: "n3" },
          { from: "n3", to: "n4" }
        ]
      }
    };
  }
}

