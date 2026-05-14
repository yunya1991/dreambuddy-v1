/**
 * 策略设置 API 路由
 * GET    - 获取策略列表(推荐+自定义)
 * POST   - 创建策略
 * PATCH  - 更新策略
 * DELETE - 删除策略
 *
 * 注意: /parse 端点已拆分到 parse/route.ts
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEMO_UID = 'Ur6GZTRLpum';

async function getUid(request?: NextRequest): Promise<string> {
  if (request) {
    const uidHeader = request.headers.get('x-uid');
    if (uidHeader) return uidHeader;
  }
  return DEMO_UID;
}

// GET /api/config/strategies
export async function GET(request: NextRequest) {
  const uid = await getUid(request);

  try {
    const strategies = await prisma.strategy.findMany({
      where: { uid },
      include: { tasks: true },
      orderBy: { createdAt: 'desc' },
    });

    // 分类
    const recommended = strategies.filter(s => s.type === 'RECOMMENDED');
    const custom = strategies.filter(s => s.type === 'CUSTOM');
    const applied = strategies.filter(s => s.status === 'APPLIED');

    return NextResponse.json({
      success: true,
      data: { strategies, recommended, custom, applied },
    });
  } catch (error) {
    console.error('获取策略列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取策略列表失败' },
      { status: 500 }
    );
  }
}

// POST /api/config/strategies - 创建策略(推荐或自定义)
export async function POST(request: NextRequest) {
  const uid = await getUid(request);

  try {
    const body = await request.json();
    const { type, name, description, direction, symbol, tradeType, leverage, positionSize, stopLoss, takeProfit, confidence, edgeScore, regime, source, rawInput } = body;

    if (!name || !direction) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段: name, direction' },
        { status: 400 }
      );
    }

    const strategy = await prisma.strategy.create({
      data: {
        uid,
        type: type || 'CUSTOM',
        name,
        description: description || null,
        direction,
        symbol: symbol || 'BTC-USDT-SWAP',
        tradeType: tradeType || 'SPOT',
        leverage: leverage ?? 1,
        positionSize: positionSize ?? 0,
        stopLoss: stopLoss ?? null,
        takeProfit: takeProfit ?? null,
        confidence: confidence ?? null,
        edgeScore: edgeScore ?? null,
        regime: regime || null,
        source: source || null,
        rawInput: rawInput || null,
        status: type === 'RECOMMENDED' ? 'DRAFT' : 'DRAFT',
      },
    });

    return NextResponse.json({
      success: true,
      data: strategy,
    });
  } catch (error) {
    console.error('创建策略失败:', error);
    return NextResponse.json(
      { success: false, error: '创建策略失败' },
      { status: 500 }
    );
  }
}

// PATCH /api/config/strategies - 更新策略
export async function PATCH(request: NextRequest) {
  const uid = await getUid(request);

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少策略ID' },
        { status: 400 }
      );
    }

    // 验证策略属于当前用户
    const existing = await prisma.strategy.findFirst({ where: { id, uid } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '策略不存在或无权限' },
        { status: 404 }
      );
    }

    const allowedFields = ['name', 'description', 'direction', 'symbol', 'tradeType', 'leverage', 'positionSize', 'stopLoss', 'takeProfit', 'confidence', 'edgeScore', 'status', 'isRead'];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) updateData[field] = updates[field];
    }

    await prisma.strategy.update({ where: { id }, data: updateData });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新策略失败:', error);
    return NextResponse.json(
      { success: false, error: '更新策略失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/config/strategies
export async function DELETE(request: NextRequest) {
  const uid = await getUid(request);

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少策略ID' },
        { status: 400 }
      );
    }

    const existing = await prisma.strategy.findFirst({ where: { id, uid } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '策略不存在或无权限' },
        { status: 404 }
      );
    }

    await prisma.strategy.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除策略失败:', error);
    return NextResponse.json(
      { success: false, error: '删除策略失败' },
      { status: 500 }
    );
  }
}
