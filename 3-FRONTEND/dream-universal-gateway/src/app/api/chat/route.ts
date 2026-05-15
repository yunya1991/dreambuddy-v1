import { NextRequest, NextResponse } from "next/server";
import { emitMonitorEvent } from "@/lib/monitor-bus";

/**
 * 意图识别类型
 */
type IntentType = 
  | 'market_query'      // 行情查询
  | 'deep_analysis'     // 深度分析
  | 'scenario_sim'      // 情景推演
  | 'strategy_verify'   // 策略验证
  | 'execute_trade'     // 执行交易
  | 'simple_qa'        // 简单问答
  | 'command';          // 命令（/开头）

/**
 * 思考模式
 */
type ThinkingMode = 'quick' | 'deep';

/**
 * 可选 Qwen 模型列表
 */
const QWEN_MODELS = [
  { id: 'qwen-turbo', name: 'Qwen Turbo', desc: '最快响应' },
  { id: 'qwen-plus', name: 'Qwen Plus', desc: '质量与速度平衡' },
  { id: 'qwen-max', name: 'Qwen Max', desc: '最强推理' },
  { id: 'qwen3-30b-a3b', name: 'Qwen3 30B-A3B', desc: 'Qwen3 MoE轻量' },
  { id: 'qwen3-235b-a22b', name: 'Qwen3 235B-A22B', desc: 'Qwen3 MoE旗舰' },
  { id: 'qwq-32b', name: 'QwQ 32B', desc: '推理增强' },
] as const;

/**
 * 意图识别结果
 */
interface IntentResult {
  intent: IntentType;
  confidence: number;
  entities?: {
    symbol?: string;
    timeframe?: string;
    strategy?: string;
  };
  routing: {
    chain: string[];
    priority: 'high' | 'medium' | 'low';
    cacheable: boolean;
  };
  context_aware?: boolean;
  thinking_mode?: ThinkingMode;
}

/**
 * 会话上下文
 */
interface SessionContext {
  session_id: string;
  last_intent?: IntentType;
  last_symbol?: string;
  last_analysis_result?: string;
  message_history: string[];
  thinking_mode: ThinkingMode;
  cached_responses: Map<string, { response: string; timestamp: number }>;
}

// 内存中的会话上下文存储
const sessionContexts = new Map<string, SessionContext>();

function getQwenApiKey(): string {
  const key = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY;
  if (!key) {
    throw new Error('DASHSCOPE_API_KEY (or QWEN_API_KEY) environment variable is not set');
  }
  return key;
}

/**
 * Qwen API 配置（支持动态切换模型）
 */
const QWEN_CONFIG = {
  endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  model: 'qwen3-30b-a3b',  // 用户指定的模型
};

/**
 * LLM 状态追踪
 */
let llmStatus: 'online' | 'offline' | 'degraded' = 'offline';
let llmLastCheck = 0;
const LLM_CHECK_INTERVAL = 60_000; // 1分钟检查一次

/**
 * 检测 LLM 可用性
 */
async function checkLLMStatus(): Promise<'online' | 'offline' | 'degraded'> {
  const now = Date.now();
  if (now - llmLastCheck < LLM_CHECK_INTERVAL && llmStatus !== 'offline') {
    return llmStatus;
  }
  
  try {
    const response = await fetch(QWEN_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getQwenApiKey()}`,
      },
      body: JSON.stringify({
        model: QWEN_CONFIG.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      }),
    });
    
    if (response.ok) {
      llmStatus = 'online';
    } else if (response.status === 403) {
      llmStatus = 'degraded'; // API可达但额度问题
    } else {
      llmStatus = 'offline';
    }
  } catch {
    llmStatus = 'offline';
  }
  
  llmLastCheck = now;
  return llmStatus;
}

/**
 * 调用 Qwen API
 */
async function callQwenAPI(messages: any[], temperature: number = 0.7): Promise<string> {
  try {
    const response = await fetch(QWEN_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getQwenApiKey()}`,
      },
      body: JSON.stringify({
        model: QWEN_CONFIG.model,
        messages: messages,
        temperature: temperature,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // 403 表示额度问题，标记为降级
      if (response.status === 403) {
        llmStatus = 'degraded';
      }
      throw new Error(`Qwen API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    llmStatus = 'online';
    return data.choices[0].message.content;
  } catch (error) {
    console.error('[Qwen API] Call failed:', error);
    throw error;
  }
}

/**
 * 配置：意图识别方法
 */
let intentMethod: 'rule' | 'llm' = 'llm';

/**
 * 基于规则的意图识别（后备方案）
 */
function recognizeIntentRule(message: string, context?: SessionContext): IntentResult {
  const msg = message.toLowerCase().trim();
  
  console.log(`[IntentRule] 输入: "${msg}"`);
  if (context) {
    console.log(`[IntentRule] 上下文: last_intent=${context.last_intent}, last_symbol=${context.last_symbol}`);
  }
  
  const mode = context?.thinking_mode || 'quick';
  
  // 命令识别（最高优先级）
  if (msg.startsWith('/')) {
    const commandMap: Record<string, IntentType> = {
      '/行情': 'market_query',
      '/分析': 'deep_analysis',
      '/推演': 'scenario_sim',
      '/验证': 'strategy_verify',
      '/开仓': 'execute_trade',
    };
    
    for (const [cmd, intent] of Object.entries(commandMap)) {
      if (msg.startsWith(cmd)) {
        console.log(`[IntentRule] 命令识别: ${cmd} → ${intent}`);
        return {
          intent,
          confidence: 0.95,
          thinking_mode: mode,
          routing: {
            chain: getChainForIntent(intent, mode),
            priority: 'high',
            cacheable: false,
          },
        };
      }
    }
  }
  
  // 上下文感知：追问检测
  if (context?.last_intent === 'deep_analysis') {
    if (msg.includes('为什么') || msg.includes('原因') || msg.includes('详细') || msg.includes('如何')) {
      console.log(`[IntentRule] 追问检测 → 直接回答模式`);
      return {
        intent: 'deep_analysis',
        confidence: 0.9,
        context_aware: true,
        thinking_mode: mode,
        entities: { symbol: context.last_symbol },
        routing: {
          chain: ['direct_answer'],
          priority: 'medium',
          cacheable: true,
        },
      };
    }
  }
  
  // 快捷追问识别
  if (context?.last_symbol) {
    if (msg.match(/^(涨|跌|怎么样|如何|怎么看|还能)$/)) {
      console.log(`[IntentRule] 快捷追问 → 使用上一轮symbol: ${context.last_symbol}`);
      return {
        intent: 'deep_analysis',
        confidence: 0.85,
        context_aware: true,
        thinking_mode: mode,
        entities: { symbol: context.last_symbol },
        routing: {
          chain: ['A1_research', 'A2_analysis'],
          priority: 'high',
          cacheable: false,
        },
      };
    }
  }
  
  // 关键词识别
  if (msg.includes('行情') || msg.includes('价格') || msg.includes('涨') || msg.includes('跌')) {
    return {
      intent: 'market_query', confidence: 0.8,
      entities: extractEntities(msg), thinking_mode: mode,
      routing: { chain: ['market_data'], priority: 'high', cacheable: true },
    };
  }
  
  if (msg.includes('分析') || msg.includes('怎么看') || msg.includes('走势')) {
    return {
      intent: 'deep_analysis', confidence: 0.85,
      entities: extractEntities(msg), thinking_mode: mode,
      routing: { chain: getChainForIntent('deep_analysis', mode), priority: 'high', cacheable: false },
    };
  }
  
  if (msg.includes('推演') || msg.includes('情景') || msg.includes('如果')) {
    return {
      intent: 'scenario_sim', confidence: 0.8,
      entities: extractEntities(msg), thinking_mode: mode,
      routing: { chain: ['A3_simulation'], priority: 'medium', cacheable: false },
    };
  }
  
  if (msg.includes('验证') || msg.includes('回测')) {
    return {
      intent: 'strategy_verify', confidence: 0.8, thinking_mode: mode,
      routing: { chain: ['A4_validation'], priority: 'medium', cacheable: false },
    };
  }
  
  if (msg.includes('开仓') || msg.includes('下单') || msg.includes('交易')) {
    return {
      intent: 'execute_trade', confidence: 0.75, thinking_mode: mode,
      routing: { chain: ['A5_execution'], priority: 'high', cacheable: false },
    };
  }
  
  console.log(`[IntentRule] 未匹配关键词，使用简单问答模式`);
  return {
    intent: 'simple_qa', confidence: 0.6, thinking_mode: mode,
    routing: { chain: ['direct_answer'], priority: 'low', cacheable: true },
  };
}

/**
 * 基于LLM的意图识别（使用Qwen）
 */
async function recognizeIntentLLM(message: string, context?: SessionContext): Promise<IntentResult> {
  const thinkingMode = context?.thinking_mode || 'quick';
  
  const systemPrompt = `你是交易助手的意图识别模块。根据用户消息输出JSON。

意图: market_query|deep_analysis|scenario_sim|strategy_verify|execute_trade|simple_qa
思考模式: ${thinkingMode === 'quick' ? '快速(轻量SKILL)' : '深度(A1-A5闭环)'}

输出格式:
{"intent":"类型","confidence":0.0-1.0,"entities":{"symbol":"BTC","timeframe":"4h"},"reasoning":"理由"}

仅输出JSON。`;

  const userPrompt = `消息:"${message}"
${context?.last_intent ? `上轮:${context.last_intent}` : ''}
${context?.last_symbol ? `上币:${context.last_symbol}` : ''}
${context?.message_history && context.message_history.length > 0 ? `近3条:${context.message_history.slice(-3).join('|')}` : ''}`;

  try {
    const response = await callQwenAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 0.2);  // 低temperature保证稳定输出

    // 鲁棒JSON解析：尝试多种提取方式
    let parsed: any = null;
    
    // 方式1: 直接匹配花括号
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {}
    }
    
    // 方式2: 提取 ```json 代码块
    if (!parsed) {
      const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        try { parsed = JSON.parse(codeBlockMatch[1]); } catch {}
      }
    }
    
    if (!parsed || !parsed.intent) {
      throw new Error('Failed to parse LLM response as intent JSON');
    }
    
    // 验证intent合法性
    const validIntents: IntentType[] = ['market_query', 'deep_analysis', 'scenario_sim', 'strategy_verify', 'execute_trade', 'simple_qa'];
    if (!validIntents.includes(parsed.intent)) {
      console.warn(`[IntentLLM] Invalid intent "${parsed.intent}", fallback to simple_qa`);
      parsed.intent = 'simple_qa';
      parsed.confidence = 0.4;
    }
    
    return {
      intent: parsed.intent,
      confidence: parsed.confidence || 0.7,
      entities: parsed.entities || {},
      thinking_mode: thinkingMode,
      routing: {
        chain: getChainForIntent(parsed.intent, thinkingMode),
        priority: (parsed.confidence || 0.7) >= 0.8 ? 'high' : 'medium',
        cacheable: parsed.intent === 'market_query' || parsed.intent === 'simple_qa',
      },
    };
  } catch (error) {
    console.error('[IntentLLM] Recognition failed, fallback to rule:', error);
    return recognizeIntentRule(message, context);
  }
}

/**
 * 根据意图和思考模式获取处理链路
 */
function getChainForIntent(intent: IntentType, thinkingMode: ThinkingMode): string[] {
  if (thinkingMode === 'quick') {
    const quickChainMap: Record<IntentType, string[]> = {
      'market_query': ['market_data'],
      'deep_analysis': ['A1_research', 'A2_analysis'],
      'scenario_sim': ['A3_simulation'],
      'strategy_verify': ['A4_validation'],
      'execute_trade': ['A5_execution'],
      'simple_qa': ['direct_answer'],
      'command': ['route_by_command'],
    };
    return quickChainMap[intent] || ['direct_answer'];
  }
  
  // 深度思考：完整闭环
  const deepChainMap: Record<IntentType, string[]> = {
    'market_query': ['market_data'],
    'deep_analysis': ['A1_research', 'A2_analysis', 'A3_simulation', 'A4_validation'],
    'scenario_sim': ['A1_research', 'A3_simulation'],
    'strategy_verify': ['A4_validation', 'A5_execution'],
    'execute_trade': ['A5_execution'],
    'simple_qa': ['direct_answer'],
    'command': ['route_by_command'],
  };
  return deepChainMap[intent] || ['direct_answer'];
}

/**
 * 意图识别入口
 */
async function recognizeIntent(message: string, context?: SessionContext): Promise<IntentResult> {
  if (intentMethod === 'llm') {
    return await recognizeIntentLLM(message, context);
  } else {
    return recognizeIntentRule(message, context);
  }
}

/**
 * 提取实体
 */
function extractEntities(msg: string): IntentResult['entities'] {
  const entities: IntentResult['entities'] = {};
  const symbols = ['btc', 'eth', 'sol', 'bnb', 'xrp'];
  for (const sym of symbols) {
    if (msg.includes(sym)) {
      entities.symbol = sym.toUpperCase();
      break;
    }
  }
  if (msg.includes('1小时') || msg.includes('1h')) entities.timeframe = '1h';
  if (msg.includes('4小时') || msg.includes('4h')) entities.timeframe = '4h';
  if (msg.includes('日线') || msg.includes('1d')) entities.timeframe = '1d';
  return entities;
}

/**
 * 生成缓存Key
 */
function generateCacheKey(intent: IntentResult, message: string): string {
  const entities = intent.entities;
  return `${intent.intent}:${entities?.symbol || '*'}:${entities?.timeframe || '*'}`;
}

/**
 * 模拟处理链路
 */
async function processWithChain(chain: string[], message: string, intent: IntentResult, context?: SessionContext): Promise<string> {
  const responses: Record<string, string> = {
    'market_data': `📊 行情数据（模拟）\nBTC-USDT-SWAP: $80,630\n24h涨跌: -0.23%\n资金费率: +0.003%`,
    'A1_research': `🔍 A1 市场侦察完成\n- 宏观环境: CPI超预期，美联储降息预期归零\n- 链上数据: 交易所净流出\n- 情绪指标: 恐惧指数42`,
    'A2_analysis': `🧠 A2 深度分析完成\n- Regime: RANGE_BOUND (置信度65%)\n- 主力矛盾: 宏观转鹰 vs 现货需求\n- 建议: 观望防守`,
    'A3_simulation': `🎲 A3 情景推演完成\n- 看涨情景 (30%): 突破$82,100\n- 看跌情景 (50%): 跌破$79,700\n- 横盘情景 (20%): 维持震荡`,
    'A4_validation': `✅ A4 策略验证完成\n- 推荐策略: 观望防守\n- 置信度: 65%\n- 风险评级: 中`,
    'A5_execution': `⚡ A5 执行决策\n- 操作: 暂不开仓\n- 原因: 区间震荡，等待突破`,
    'direct_answer': `💡 根据上一轮分析，我来补充说明：\n\n这是基于上下文的追问回答。`,
  };
    
  let result = '';
  if (intent.context_aware) {
    result = `💡 根据上一轮分析，我来补充说明：\n\n`;
  }
    
  for (const step of chain) {
    if (responses[step]) {
      result += responses[step] + '\n\n';
    }
  }
    
  return result || '正在处理你的请求...';
}

/**
 * POST /api/chat
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, session_id, thinking_mode } = body;
      
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
      
    console.log(`[Chat API] Received: "${message}" (session: ${session_id || 'none'}, mode: ${thinking_mode || 'quick'})`);

    // 📡 监控埋点: 用户请求进入 (Chat模式)
    const chatTraceId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    emitMonitorEvent({
      trace_id: chatTraceId,
      uid: session_id || 'anonymous',
      layer: 'frontend',
      phase: 'user_input',
      status: 'received',
      thinking_mode: thinking_mode || 'quick',
      message_preview: message.slice(0, 50),
    });

    // 获取或创建会话上下文
    let context = session_id ? sessionContexts.get(session_id) : undefined;
    if (session_id && !context) {
      context = {
        session_id,
        message_history: [],
        thinking_mode: thinking_mode || 'quick',
        cached_responses: new Map(),
      };
      sessionContexts.set(session_id, context);
    }
      
    // 更新思考模式
    if (thinking_mode && context) {
      context.thinking_mode = thinking_mode;
    }
      
    // 1. 意图识别
    const intentResult = await recognizeIntent(message, context);
    console.log(`[Chat API] Intent: ${intentResult.intent} (confidence: ${intentResult.confidence}, context_aware: ${intentResult.context_aware || false}, mode: ${intentResult.thinking_mode})`);

    // 📡 监控埋点: 意图识别完成
    emitMonitorEvent({
      trace_id: chatTraceId,
      uid: session_id || 'anonymous',
      layer: 'frontend',
      phase: 'intent_recognized',
      status: 'completed',
      intent: intentResult.intent,
      thinking_mode: intentResult.thinking_mode || 'quick',
      chain: intentResult.routing.chain,
    });console.log(`[Chat API] Routing chain: ${intentResult.routing.chain.join(' → ')}`);
      
    // 2. 缓存检查
    let response: string;
    if (intentResult.routing.cacheable && context) {
      const cacheKey = generateCacheKey(intentResult, message);
      const cached = context.cached_responses.get(cacheKey);
        
      if (cached && (Date.now() - cached.timestamp < 5 * 60 * 1000)) {
        console.log(`[Chat API] Cache hit: ${cacheKey}`);
        response = cached.response;
      } else {
        response = await processWithChain(intentResult.routing.chain, message, intentResult, context);
        if (context) {
          context.cached_responses.set(cacheKey, { response, timestamp: Date.now() });
        }
      }
    } else {
      response = await processWithChain(intentResult.routing.chain, message, intentResult, context);
    }
      
    // 3. 更新会话上下文
    if (context) {
      context.last_intent = intentResult.intent;
      context.last_symbol = intentResult.entities?.symbol || context.last_symbol;
      context.message_history.push(message);
      if (context.message_history.length > 20) {
        context.message_history = context.message_history.slice(-20);
      }
    }
      
    // 4. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        content: response,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        chain: intentResult.routing.chain,
        context_aware: intentResult.context_aware || false,
        thinking_mode: intentResult.thinking_mode || 'quick',
        llm_status: llmStatus,
        llm_model: QWEN_CONFIG.model,
        intent_method: intentMethod,
        timestamp: new Date().toISOString(),
      },
    });
      
  } catch (error) {
    console.error('[Chat API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat
 * 状态查询 + 聊天历史（预留）
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  // 状态查询
  if (action === 'status') {
    const status = await checkLLMStatus();
    return NextResponse.json({
      success: true,
      data: {
        llm_status: status,
        llm_model: QWEN_CONFIG.model,
        intent_method: intentMethod,
        available_models: QWEN_MODELS,
        timestamp: new Date().toISOString(),
      },
    });
  }
  
  // 切换模型
  if (action === 'set_model') {
    const model = searchParams.get('model');
    if (model) {
      QWEN_CONFIG.model = model;
      llmStatus = 'offline'; // 重置状态，下次请求时重新检查
      llmLastCheck = 0;
      return NextResponse.json({
        success: true,
        data: { message: `Model switched to ${model}`, llm_model: QWEN_CONFIG.model },
      });
    }
    return NextResponse.json({ success: false, error: 'model parameter required' }, { status: 400 });
  }
  
  // 切换识别方法
  if (action === 'set_method') {
    const method = searchParams.get('method');
    if (method === 'rule' || method === 'llm') {
      intentMethod = method;
      return NextResponse.json({
        success: true,
        data: { message: `Intent method switched to ${method}`, intent_method: intentMethod },
      });
    }
    return NextResponse.json({ success: false, error: 'method must be rule or llm' }, { status: 400 });
  }
  
  // 默认：返回聊天历史（预留）
  const sessionId = searchParams.get('session_id');
  return NextResponse.json({
    success: true,
    data: { messages: [], session_id: sessionId },
  });
}
