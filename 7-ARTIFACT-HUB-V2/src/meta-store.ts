import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { BoardProposal, ApprovalGate, ExecutionReview } from "./types.js";

export class MetaStore {
  private readonly db: DatabaseSync;

  constructor(metaRoot: string) {
    fs.mkdirSync(metaRoot, { recursive: true });
    const dbPath = path.join(metaRoot, "artifact_hub.sqlite");
    this.db = new DatabaseSync(dbPath);
    this.bootstrap();
  }

  private bootstrap(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        trace_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        ts INTEGER NOT NULL,
        PRIMARY KEY (trace_id, event_id)
      );

      CREATE TABLE IF NOT EXISTS route_decisions (
        trace_id TEXT NOT NULL,
        decision_id TEXT NOT NULL,
        intent_json TEXT NOT NULL,
        decision_json TEXT NOT NULL,
        policy_version TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        department TEXT NOT NULL DEFAULT 'unknown',
        selected_route TEXT NOT NULL DEFAULT '',
        decision_level TEXT NOT NULL DEFAULT 'standard',
        PRIMARY KEY (trace_id, decision_id)
      );

      CREATE TABLE IF NOT EXISTS executions (
        execution_id TEXT PRIMARY KEY,
        trace_id TEXT NOT NULL,
        intent_id TEXT NOT NULL,
        decision_id TEXT NOT NULL,
        workflow_id TEXT NOT NULL,
        workflow_type TEXT NOT NULL,
        department TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        finished_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS audit_records (
        audit_id TEXT PRIMARY KEY,
        trace_id TEXT NOT NULL,
        department TEXT NOT NULL,
        decision_snapshot_json TEXT NOT NULL,
        execution_snapshot_json TEXT NOT NULL,
        events_json TEXT NOT NULL DEFAULT '[]',
        risk_flags_json TEXT,
        review_notes TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS board_proposals (
        proposal_id TEXT PRIMARY KEY,
        trace_id TEXT NOT NULL,
        department TEXT NOT NULL,
        decision_level TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        proposer_agent TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TEXT NOT NULL,
        resolved_at TEXT
      );

      CREATE TABLE IF NOT EXISTS approval_gates (
        gate_id TEXT PRIMARY KEY,
        proposal_id TEXT NOT NULL,
        required_approvers_json TEXT NOT NULL,
        received_approvals_json TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'pending',
        decided_at TEXT
      );

      CREATE TABLE IF NOT EXISTS execution_reviews (
        review_id TEXT PRIMARY KEY,
        trace_id TEXT NOT NULL,
        execution_id TEXT NOT NULL,
        reviewer_agent TEXT NOT NULL,
        verdict TEXT NOT NULL,
        findings TEXT NOT NULL,
        recommendations TEXT NOT NULL,
        reviewed_at TEXT NOT NULL
      );
    `);
  }

  addEvent(
    traceId: string,
    eventId: string,
    type: string,
    payload: unknown,
    ts = Date.now()
  ): void {
    const stmt = this.db.prepare(
      `INSERT INTO events(trace_id,event_id,type,payload_json,ts) VALUES(?,?,?,?,?)`
    );
    stmt.run(traceId, eventId, type, JSON.stringify(payload), ts);
  }

  listEvents(traceId: string): Array<{ type: string; payload: unknown; ts: number }> {
    const stmt = this.db.prepare(
      `SELECT type,payload_json,ts FROM events WHERE trace_id=? ORDER BY ts ASC`
    );
    return (stmt.all(traceId) as any[]).map((r) => ({
      type: r.type,
      payload: JSON.parse(r.payload_json),
      ts: r.ts,
    }));
  }

  addRouteDecision(
    traceId: string,
    decisionId: string,
    intent: unknown,
    decision: unknown,
    policyVersion = "v0",
    createdAt = Date.now(),
    department = "unknown",
    selectedRoute = "",
    decisionLevel = "standard"
  ): void {
    const stmt = this.db.prepare(
      `INSERT INTO route_decisions(trace_id,decision_id,intent_json,decision_json,policy_version,created_at,department,selected_route,decision_level) VALUES(?,?,?,?,?,?,?,?,?)`
    );
    stmt.run(
      traceId,
      decisionId,
      JSON.stringify(intent),
      JSON.stringify(decision),
      policyVersion,
      createdAt,
      department,
      selectedRoute,
      decisionLevel
    );
  }

  getLatestRouteDecision(
    traceId: string
  ): { intent: unknown; decision: unknown; created_at: number } | null {
    const stmt = this.db.prepare(
      `SELECT intent_json,decision_json,created_at FROM route_decisions WHERE trace_id=? ORDER BY created_at DESC LIMIT 1`
    );
    const row = stmt.get(traceId) as any;
    if (!row) return null;
    return {
      intent: JSON.parse(row.intent_json),
      decision: JSON.parse(row.decision_json),
      created_at: row.created_at,
    };
  }

  addExecution(
    executionId: string,
    traceId: string,
    intentId: string,
    decisionId: string,
    workflowId: string,
    workflowType: string,
    department: string,
    status: string,
    startedAt = Date.now()
  ): void {
    const stmt = this.db.prepare(
      `INSERT INTO executions(execution_id,trace_id,intent_id,decision_id,workflow_id,workflow_type,department,status,started_at) VALUES(?,?,?,?,?,?,?,?,?)`
    );
    stmt.run(executionId, traceId, intentId, decisionId, workflowId, workflowType, department, status, startedAt);
  }

  updateExecutionStatus(executionId: string, status: string, finishedAt = Date.now()): void {
    const stmt = this.db.prepare(
      `UPDATE executions SET status=?,finished_at=? WHERE execution_id=?`
    );
    stmt.run(status, finishedAt, executionId);
  }

  addAuditRecord(
    auditId: string,
    traceId: string,
    department: string,
    decisionSnapshot: unknown,
    executionSnapshot: unknown,
    events: unknown[] = [],
    riskFlags?: string[],
    reviewNotes?: string,
    createdAt = Date.now()
  ): void {
    const stmt = this.db.prepare(
      `INSERT INTO audit_records(audit_id,trace_id,department,decision_snapshot_json,execution_snapshot_json,events_json,risk_flags_json,review_notes,created_at) VALUES(?,?,?,?,?,?,?,?,?)`
    );
    stmt.run(
      auditId,
      traceId,
      department,
      JSON.stringify(decisionSnapshot),
      JSON.stringify(executionSnapshot),
      JSON.stringify(events),
      riskFlags ? JSON.stringify(riskFlags) : null,
      reviewNotes ?? null,
      createdAt
    );
  }

  addBoardProposal(proposal: BoardProposal): void {
    const stmt = this.db.prepare(
      `INSERT INTO board_proposals(proposal_id,trace_id,department,decision_level,title,summary,proposer_agent,status,created_at,resolved_at) VALUES(?,?,?,?,?,?,?,?,?,?)`
    );
    stmt.run(
      proposal.proposal_id,
      proposal.trace_id,
      proposal.department,
      proposal.decision_level,
      proposal.title,
      proposal.summary,
      proposal.proposer_agent,
      proposal.status,
      proposal.created_at,
      proposal.resolved_at ?? null
    );
  }

  addApprovalGate(gate: ApprovalGate): void {
    const stmt = this.db.prepare(
      `INSERT INTO approval_gates(gate_id,proposal_id,required_approvers_json,received_approvals_json,status,decided_at) VALUES(?,?,?,?,?,?)`
    );
    stmt.run(
      gate.gate_id,
      gate.proposal_id,
      JSON.stringify(gate.required_approvers),
      JSON.stringify(gate.received_approvals),
      gate.status,
      gate.decided_at ?? null
    );
  }

  addExecutionReview(review: ExecutionReview): void {
    const stmt = this.db.prepare(
      `INSERT INTO execution_reviews(review_id,trace_id,execution_id,reviewer_agent,verdict,findings,recommendations,reviewed_at) VALUES(?,?,?,?,?,?,?,?)`
    );
    stmt.run(
      review.review_id,
      review.trace_id,
      review.execution_id,
      review.reviewer_agent,
      review.verdict,
      review.findings,
      review.recommendations,
      review.reviewed_at
    );
  }

  listExecutionReviews(traceId?: string): ExecutionReview[] {
    const stmt = traceId
      ? this.db.prepare(`SELECT * FROM execution_reviews WHERE trace_id=? ORDER BY reviewed_at ASC`)
      : this.db.prepare(`SELECT * FROM execution_reviews ORDER BY reviewed_at ASC`);
    const rows = traceId ? (stmt.all(traceId) as any[]) : (stmt.all() as any[]);
    return rows.map((r) => ({
      review_id: r.review_id,
      trace_id: r.trace_id,
      execution_id: r.execution_id,
      reviewer_agent: r.reviewer_agent,
      verdict: r.verdict,
      findings: r.findings,
      recommendations: r.recommendations,
      reviewed_at: r.reviewed_at,
    }));
  }
}
