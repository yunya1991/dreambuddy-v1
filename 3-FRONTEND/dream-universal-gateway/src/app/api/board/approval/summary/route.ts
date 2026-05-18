import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const strategies = await prisma.strategy.findMany({ select: { status: true } });
    const summary = { total: strategies.length, pending: 0, approved: 0, rejected: 0 };
    for (const s of strategies) {
      if (s.status==="DRAFT") summary.pending++;
      else if (["APPROVED","APPLIED"].includes(s.status||"")) summary.approved++;
      else if (s.status==="EXPIRED") summary.rejected++;
    }
    return NextResponse.json({ success:true, data: summary });
  } catch(err) {
    return NextResponse.json({ success:false, error: err instanceof Error?err.message:"db_error" }, {status:500});
  }
}