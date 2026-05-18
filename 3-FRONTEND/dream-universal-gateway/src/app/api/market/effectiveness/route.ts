import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      select: { id:true, name:true, totalTrades:true, winRate:true, pnl:true, appliedAt:true },
      orderBy: { appliedAt: "desc" }, take: 20,
    });
    return NextResponse.json({ success:true, data: tasks.map(t=>({
      ...t,
      appliedAt: t.appliedAt?.toISOString(),
      winRate: t.winRate ?? 0,
      pnl: t.pnl ?? 0,
      totalTrades: t.totalTrades ?? 0,
    })) });
  } catch(err) {
    return NextResponse.json({ success:false, error: err instanceof Error ? err.message : "db_error" }, { status:500 });
  }
}