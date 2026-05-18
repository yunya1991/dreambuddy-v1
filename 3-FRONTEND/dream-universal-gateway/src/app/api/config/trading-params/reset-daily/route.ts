/**
 * POST /api/config/trading-params/reset-daily
 * 重置日亏损计数
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEMO_UID = 'Ur6GZTRLpum';

export async function POST(request: NextRequest) {
  const uid = request.headers.get('x-uid') || DEMO_UID;

  try {
    const today = new Date().toISOString().split('T')[0];

    await prisma.tradingParams.upsert({
      where: { uid },
      update: {
        todayLoss: 0,
        todayTradeCount: 0,
        lastResetDate: today,
        status: 'ACTIVE', // 重置时自动解除LOCKED状态
      },
      create: {
        uid,
        todayLoss: 0,
        todayTradeCount: 0,
        lastResetDate: today,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        dailyLossUsed: 0,
        isDailyLimited: false,
        resetDate: today,
      },
    });
  } catch (error) {
    console.error('重置日亏损失败:', error);
    return NextResponse.json(
      { success: false, error: '重置日亏损失败' },
      { status: 500 }
    );
  }
}
