import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

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
        PRIMARY KEY (trace_id, decision_id)
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
    createdAt = Date.now()
  ): void {
    const stmt = this.db.prepare(
      `INSERT INTO route_decisions(trace_id,decision_id,intent_json,decision_json,policy_version,created_at) VALUES(?,?,?,?,?,?)`
    );
    stmt.run(
      traceId,
      decisionId,
      JSON.stringify(intent),
      JSON.stringify(decision),
      policyVersion,
      createdAt
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
}
