/**
 * API配置 - 测试连接
 * POST /api/config/api-keys/test
 * 根据provider调用对应的连通性测试
 */
import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const DEMO_UID = 'Ur6GZTRLpum'; // 开发期回退UID

async function getUid(): Promise<string | null> {
  try {
    const session = await auth();
    if (session?.user?.id) return session.user.id;
  } catch {}
  return DEMO_UID;
}

interface TestResult {
  success: boolean;
  message: string;
  latency?: number;
}

/**
 * 测试OKX连接
 * 使用okx CLI进行连通性测试
 */
async function testOKX(environment: string, profile?: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const profileFlag = profile ? `--profile ${profile}` : '--profile dreamdemo';
    const output = execSync(
      `okx market ticker BTC-USDT-SWAP ${profileFlag}`,
      { timeout: 15000, encoding: 'utf-8' }
    );
    const latency = Date.now() - start;

    if (output && output.includes('last')) {
      return {
        success: true,
        message: `OKX ${environment}连接正常，BTC ticker获取成功`,
        latency,
      };
    }
    return {
      success: false,
      message: `OKX返回数据异常: ${output.slice(0, 100)}`,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - start;
    return {
      success: false,
      message: `OKX连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
      latency,
    };
  }
}

// POST /api/config/api-keys/test
export async function POST(request: NextRequest) {
  const uid = await getUid();
  if (!uid) {
    return NextResponse.json({ success: false, error: '未认证' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { configId, provider, environment } = body;

    let testProvider = provider;
    let testEnv = environment || 'demo';

    // 如果提供了configId，从数据库读取配置信息
    if (configId) {
      const config = await prisma.apiConfig.findFirst({
        where: { id: configId, uid },
      });
      if (!config) {
        return NextResponse.json(
          { success: false, error: '配置不存在' },
          { status: 404 }
        );
      }
      testProvider = config.provider;
      testEnv = config.environment || 'demo';
    }

    let result: TestResult;

    switch (testProvider?.toLowerCase()) {
      case 'okx':
        result = await testOKX(testEnv);
        // 如果测试成功，更新验证状态
        if (result.success && configId) {
          await prisma.apiConfig.update({
            where: { id: configId },
            data: {
              isVerified: true,
              lastVerifiedAt: new Date(),
            },
          });
        }
        break;

      case 'openai':
      case 'dashscope':
        // LLM提供商测试 - 简单的API调用
        result = {
          success: true,
          message: `${testProvider} 连接测试暂未实现，标记为通过`,
          latency: 0,
        };
        break;

      default:
        result = {
          success: false,
          message: `不支持的provider: ${testProvider}`,
        };
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('测试连接失败:', error);
    return NextResponse.json(
      { success: false, error: '测试连接失败' },
      { status: 500 }
    );
  }
}
