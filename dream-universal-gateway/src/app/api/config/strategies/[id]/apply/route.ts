/**
 * POST /api/config/strategies/[id]/apply
 * 应用策略 - 将策略状态改为APPLIED并创建定时任务
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

    // 更新策略状态为APPLIED
    await prisma.strategy.update({
      where: { id },
      data: { status: 'APPLIED' },
    });

    // 支持前端传入频率，否则使用用户偏好或默认值
    let frequency: string = 'FOUR_H';
    try {
      const body = await request.json();
      if (body.frequency && ['ONE_H', 'FOUR_H', 'ONE_D'].includes(body.frequency)) {
        frequency = body.frequency;
      }
    } catch {
      // 无 request body 时走默认逻辑
    }
    if (!request.body) {
      const profile = await prisma.userProfile.findUnique({ where: { uid } });
      frequency = profile?.preferredFrequency ?? 'FOUR_H';
    }

    // 创建定时任务
    const now = new Date();
    const nextExec = new Date(now.getTime() + (
      frequency === 'ONE_H' ? 3600000 :
      frequency === 'ONE_D' ? 86400000 : 14400000 // FOUR_H default
    ));

    await prisma.strategyTask.create({
      data: {
        strategyId: id,
        uid,
        executionFrequency: frequency as 'ONE_H' | 'FOUR_H' | 'ONE_D',
        status: 'ACTIVE',
        nextExecutionAt: nextExec,
      },
    });

    return NextResponse.json({
      success: true,
      data: { status: 'APPLIED', nextExecutionAt: nextExec.toISOString() },
    });
  } catch (error) {
    console.error('应用策略失败:', error);
    return NextResponse.json({ success: false, error: '应用策略失败' }, { status: 500 });
  }
}
