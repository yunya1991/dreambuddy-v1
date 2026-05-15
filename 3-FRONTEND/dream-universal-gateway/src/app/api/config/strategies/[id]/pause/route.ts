/**
 * POST /api/config/strategies/[id]/pause
 * 暂停策略
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEMO_UID = 'Ur6GZTRLpum';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const uid = request.headers.get('x-uid') || DEMO_UID;

  try {
    const strategy = await prisma.strategy.findFirst({ where: { id, uid } });
    if (!strategy) {
      return NextResponse.json({ success: false, error: '策略不存在' }, { status: 404 });
    }

    // 更新策略状态
    await prisma.strategy.update({
      where: { id },
      data: { status: 'PAUSED' },
    });

    // 暂停关联任务
    await prisma.strategyTask.updateMany({
      where: { strategyId: id },
      data: { status: 'PAUSED' },
    });

    return NextResponse.json({ success: true, data: { status: 'PAUSED' } });
  } catch (error) {
    console.error('暂停策略失败:', error);
    return NextResponse.json({ success: false, error: '暂停策略失败' }, { status: 500 });
  }
}
