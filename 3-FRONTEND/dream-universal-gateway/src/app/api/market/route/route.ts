import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const records = await prisma.routeDecision.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const data = records.map(r => ({
      id: r.id,
      traceId: r.traceId,
      selectedRoute: r.selectedRoute,
      reason: r.reason,
      department: r.department,
      policyVersion: r.policyVersion,
      decisionLevel: r.decisionLevel,
      createdAt: r.createdAt.toISOString(),
    }));
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "db_error" }, { status: 500 });
  }
}