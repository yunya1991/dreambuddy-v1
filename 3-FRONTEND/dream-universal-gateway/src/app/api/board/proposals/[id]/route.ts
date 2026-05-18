import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const s = await prisma.strategy.findUnique({
      where: { id: params.id },
      include: { tasks: { select: { id:true, name:true, status:true, totalTrades:true } } },
    });
    if (!s) return NextResponse.json({ success:false, error:"not_found" }, {status:404});
    return NextResponse.json({ success:true, data: {
      ...s,
      title: s.name,
      createdAt: s.createdAt.toISOString(),
      tasks: s.tasks,
    } });
  } catch(err) {
    return NextResponse.json({ success:false, error: err instanceof Error?err.message:"db_error" }, {status:500});
  }
}