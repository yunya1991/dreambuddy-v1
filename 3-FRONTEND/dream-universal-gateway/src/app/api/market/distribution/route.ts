import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Use PushTaskLog if available, fall back to channels config
    const channels = await prisma.channel.findMany({
      select: { id: true, type: true, name: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    const data = channels.map(ch => ({
      id: ch.id,
      channelType: ch.type,
      messageType: "channel_config",
      status: ch.isActive ? "sent" : "pending" as "sent" | "pending",
      recipient: ch.name,
      sentAt: ch.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "db_error" }, { status: 500 });
  }
}