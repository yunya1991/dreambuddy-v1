import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      select: { id:true, name:true, status:true, totalTrades:true, winRate:true, pnl:true, appliedAt:true },
      where: { status: { in: ["COMPLETED","FAILED","PAUSED"] } },
      orderBy: { appliedAt: "desc" }, take: 20,
    });
    return NextResponse.json({ success:true, data: tasks.map(t=>({
      id:t.id, strategyName:t.name, status:t.status,
      totalTrades:t.totalTrades??0, winRate:t.winRate??0, pnl:t.pnl??0,
      score:null, review:null,
      appliedAt:t.appliedAt?.toISOString()??null,
    })) });
  } catch(err) {
    return NextResponse.json({ success:false, error: err instanceof Error?err.message:"db_error" }, {status:500});
  }
}