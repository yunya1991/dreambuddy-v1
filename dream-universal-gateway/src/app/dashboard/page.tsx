"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import dynamic from 'next/dynamic';
import "./dashboard.css";

// 动态导入 react-markdown (客户端only)
const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });

// Color system
const colors = {
  bgPrimary: "#1a1a2e",
  bgSecondary: "#16213e",
  bgChat: "#0f3460",
  textPrimary: "#e4e4e7",
  textSecondary: "#a1a1aa",
  accentBlue: "#3b82f6",
  accentGreen: "#22c55e",
  accentRed: "#ef4444",
};

// Qwen 模型列表
const QWEN_MODELS = [
  { id: 'qwen-turbo', name: 'Qwen Turbo', desc: '最快响应' },
  { id: 'qwen-plus', name: 'Qwen Plus', desc: '质量与速度平衡' },
  { id: 'qwen-max', name: 'Qwen Max', desc: '最强推理' },
  { id: 'qwen3-30b-a3b', name: 'Qwen3 30B-A3B', desc: 'MoE轻量' },
  { id: 'qwen3-235b-a22b', name: 'Qwen3 235B-A22B', desc: 'MoE旗舰' },
  { id: 'qwq-32b', name: 'QwQ 32B', desc: '推理增强' },
];

type RightPanelType = 'analysis' | 'market' | 'signal' | 'position' | 'api' | 'trading' | 'strategy' | 'communication' | 'llm' | 'report' | 'monitor';

// 链路步骤定义
const CHAIN_STEP_MAP: Record<string, { label: string; icon: string }> = {
  'A1_research':  { label: '市场侦察', icon: '🔍' },
  'A2_analysis':  { label: '深度分析', icon: '🧠' },
  'A3_simulation': { label: '情景推演', icon: '🎲' },
  'A4_validation': { label: '方案验证', icon: '✅' },
  'A5_execution':  { label: '决策执行', icon: '⚡' },
  'A6_intel':     { label: '情报更新', icon: '📡' },
  'A7_gate':      { label: '风控审查', icon: '🛡️' },
};

// 意图→默认链路映射
const INTENT_CHAIN_MAP: Record<string, string[]> = {
  'market_query':    ['A1_research'],
  'deep_analysis':   ['A1_research', 'A2_analysis'],
  'scenario_sim':    ['A1_research', 'A3_simulation'],
  'strategy_verify': ['A4_validation'],
  'execute_trade':   ['A5_execution'],
  // 深度思考完整链路
  'deep_full':       ['A1_research', 'A2_analysis', 'A3_simulation', 'A4_validation'],
};

// API配置类型
interface ApiConfigItem {
  id: string;
  category: string;
  provider: string;
  label: string;
  keyHint: string;
  environment?: string;
  isVerified: boolean;
  lastVerifiedAt?: string;
}

// 行情数据类型
interface MarketData {
  symbol: string;
  price?: number;
  change24h?: number;
  open24h?: number;
  high24h?: number;
  low24h?: number;
  fundingRate?: string | null;
  volume24h?: string;
  positions?: Array<Record<string, unknown>>;
  timestamp: string;
}

// 研报元数据类型
interface ReportMeta {
  file: string;
  title: string;
  date: string;
  chain_phase: string;
  tags: string;
  status: string;
  confidence?: number;
  phaseColor: string;
  regime?: string;
  direction?: string;
  isToday?: boolean;
  relativeTime?: string;
  freshness?: 'today' | 'stale';
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  
  const [dataCardExpanded, setDataCardExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [rightPanelContent, setRightPanelContent] = useState<RightPanelType>('analysis');
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingMode, setThinkingMode] = useState<'quick' | 'deep'>('quick');
  const [workbuddyMode, setWorkbuddyMode] = useState(true); // WorkBuddy桥接模式

  // ========== 动态分析链路追踪 ==========
  const [analysisChain, setAnalysisChain] = useState<{
    id: string;
    label: string;
    icon: string;
    status: 'idle' | 'running' | 'completed' | 'error';
    summary?: string;
    timestamp?: string;
  }[]>([]);
  const [analysisStartTime, setAnalysisStartTime] = useState<number | null>(null);
  const [analysisEndTime, setAnalysisEndTime] = useState<number | null>(null);
  const [analysisIntent, setAnalysisIntent] = useState<string>('');
  const [analysisConfidence, setAnalysisConfidence] = useState<number | null>(null);

  // ========== 监控面板状态 ==========
  const [monitorEvents, setMonitorEvents] = useState<Array<{
    id: string; trace_id: string; uid: string; timestamp: string;
    layer: string; phase: string; status: string;
    intent?: string; thinking_mode?: string; chain?: string[];
    duration_ms?: number; error?: string; artifact_file?: string; message_preview?: string;
  }>>([]);
  const [monitorPaused, setMonitorPaused] = useState(false);
  const [monitorPipeline, setMonitorPipeline] = useState<{
    frontend: { total: number; completed: number; rate: string };
    gateway: { total: number; completed: number; rate: string };
    workbuddy: { total: number; completed: number; rate: string };
    artifact_hub: { total: number; completed: number; rate: string };
  } | null>(null);
  const [monitorStats, setMonitorStats] = useState<{
    total_requests: number; total_completed: number; total_failed: number; total_timeout: number;
    success_rate: number; avg_duration_ms: number; active_traces: number;
    intent_distribution: Record<string, number>;
  } | null>(null);
  const [monitorSelectedTrace, setMonitorSelectedTrace] = useState<string | null>(null);
  const monitorSSERef = useRef<EventSource | null>(null);
  
  // LLM 状态
  const [llmStatus, setLlmStatus] = useState<'online' | 'offline' | 'degraded'>('offline');
  const [llmModel, setLlmModel] = useState('qwen3-30b-a3b');
  const [intentMethod, setIntentMethod] = useState<'rule' | 'llm'>('llm');
  
  const [messages, setMessages] = useState<{
    role: string;
    content: string;
    intent?: string;
    confidence?: number;
    context_aware?: boolean;
    chain?: string[];
    thinking_mode?: string;
    trade_task_id?: string; // 交易任务ID，用于确认交互
    trade_confirmed?: boolean; // 交易是否已确认/取消
  }[]>([
    {
      role: "assistant",
      content: "你好！我是 Dream Gateway 智能交易助手。我可以帮你分析市场、制定策略、管理交易。\n\n⚡ **快速思考**：轻量级，即时响应\n🧠 **深度思考**：完整A1-A5闭环深度调研\n\n🔗 **桥接模式**：中台即时执行，秒级响应\n💬 **直接模式**：LLM/Mock即时对话\n\n⚠️ 交易任务需确认执行时间，不会自动执行\n\n试试输入「/行情」或「分析BTC」",
    },
  ]);

  // ========== 新增状态 ==========

  // API配置状态
  const [apiConfigs, setApiConfigs] = useState<ApiConfigItem[]>([]);
  const [showAddApiForm, setShowAddApiForm] = useState(false);
  const [addApiForm, setAddApiForm] = useState({
    category: 'EXCHANGE',
    provider: 'okx',
    label: '',
    apiKey: '',
    secretKey: '',
    passphrase: '',
    environment: 'demo',
  });
  const [apiTesting, setApiTesting] = useState<string | null>(null);
  const [apiTestResult, setApiTestResult] = useState<Record<string, { success: boolean; message: string }> | null>(null);

  // 交易参数状态
  const [tradingParams, setTradingParams] = useState<{
    params: {
      availableCapital?: number | null;
      capitalPercentage: number;
      tradeType: string;
      tradeMode: string;
      marginMode?: string | null;
      positionMode: string;
      leverageMax: number;
      dailyLossLimit: number;
      dailyLossPercent: number;
      accountLossLimit: number;
      accountLossPercent: number;
      allowedSymbols: string[];
      allowedTradeModes: string[];
      isTradingEnabled: boolean;
      optionsType?: string | null;
      expiryDate?: string | null;
      riskTolerance: string;
      preferredFrequency?: string | null;
    };
    liveStatus: {
      todayLoss: number;
      todayTradeCount: number;
      totalLoss: number;
      totalTradeCount: number;
      status: string;
      lastResetDate: string;
    };
    exchangeStatus: {
      provider: string;
      isConfigured: boolean;
      isVerified: boolean;
      environment: string;
      lastVerifiedAt?: string;
    } | null;
  } | null>(null);
  const [tradingLoading, setTradingLoading] = useState(false);
  const [tradingEditing, setTradingEditing] = useState(false);
  const [tradingSaving, setTradingSaving] = useState(false);
  const [tradingEditForm, setTradingEditForm] = useState<Record<string, unknown>>({});

  // 策略状态
  const [strategies, setStrategies] = useState<{
    recommended: unknown[];
    custom: unknown[];
    applied: unknown[];
  }>({ recommended: [], custom: [], applied: [] });
  const [strategiesLoading, setStrategiesLoading] = useState(false);
  const [customStrategyInput, setCustomStrategyInput] = useState('');
  const [customStrategyLoading, setCustomStrategyLoading] = useState(false);

  // === 策略向导状态 (Wizard) ===
  type StrategyWizardStep = 'input' | 'preview' | 'confirm';
  const [wizardStep, setWizardStep] = useState<StrategyWizardStep>('input');
  const [wizardParsing, setWizardParsing] = useState(false);
  const [parsedStrategy, setParsedStrategy] = useState<{
    intent: { direction: string; symbol: string; tradeType: string; indicators: string[] };
    suggestedParams: { direction: string; symbol: string; tradeType: string; leverage: number; positionSize: number; stopLoss: number | null; takeProfit: number | null };
    confidence: number;
    explanation: string;
    warnings: string[];
  } | null>(null);
  const [wizardForm, setWizardForm] = useState({
    direction: 'BUY' as string,
    symbol: 'BTC-USDT-SWAP',
    tradeType: 'SPOT' as string,
    leverage: 2,
    positionSize: 0.3,
    stopLoss: '' as string,
    takeProfit: '' as string,
    frequency: 'FOUR_H' as string,
  });
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [showDrafts, setShowDrafts] = useState(false);
  const [toast, setToast] = useState<{ id: number; type: 'success' | 'error'; msg: string } | null>(null);
  let toastIdCounter = 0;
  // Toast helper
  const showToast = (type: 'success' | 'error', msg: string) => {
    const id = ++toastIdCounter;
    setToast({ id, type, msg });
    setTimeout(() => setToast(prev => (prev?.id === id ? null : prev)), 3000);
  };

  // 通信渠道状态
  const [channels, setChannels] = useState<unknown[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [showAddChannelForm, setShowAddChannelForm] = useState(false);
  const [addChannelForm, setAddChannelForm] = useState({
    channelType: 'TELEGRAM',
    label: '',
    botToken: '',
    chatId: '',
    sendKey: '',
    enabledTypes: ['trade_signal', 'risk_alert', 'intel_update'],
    format: 'CONCISE',
    silentStart: '',
    silentEnd: '',
  });
  const [channelTesting, setChannelTesting] = useState<string | null>(null);
  const [channelTestResult, setChannelTestResult] = useState<Record<string, { success: boolean; message: string }> | null>(null);

  // 行情数据状态
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('BTC-USDT-SWAP');
  const [marketError, setMarketError] = useState<string | null>(null);
  const marketIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reportIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 研报状态
  const [reportList, setReportList] = useState<ReportMeta[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<{ filename: string; content: string; metadata: ReportMeta | null } | null>(null);
  const [reportContentLoading, setReportContentLoading] = useState(false);

  // 获取 LLM 状态
  const fetchLLMStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/chat?action=status');
      const data = await res.json();
      if (data.success) {
        setLlmStatus(data.data.llm_status);
        setLlmModel(data.data.llm_model);
        setIntentMethod(data.data.intent_method);
      }
    } catch {}
  }, []);

  // 获取API配置列表
  const fetchApiConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/config/api-keys');
      const data = await res.json();
      if (data.success) {
        setApiConfigs(data.data);
      }
    } catch {}
  }, []);

  // 获取交易参数
  const fetchTradingParams = useCallback(async () => {
    setTradingLoading(true);
    try {
      const res = await fetch('/api/config/trading-params');
      const data = await res.json();
      if (data.success) {
        setTradingParams(data.data);
        if (data.data.params) {
          setTradingEditForm({
            availableCapital: data.data.params.availableCapital ?? '',
            capitalPercentage: Math.round(data.data.params.capitalPercentage * 100),
            tradeMode: data.data.params.tradeMode,
            marginMode: data.data.params.marginMode ?? 'CROSS',
            positionMode: data.data.params.positionMode,
            leverageMax: data.data.params.leverageMax,
            dailyLossLimit: data.data.params.dailyLossLimit,
            dailyLossPercent: Math.round(data.data.params.dailyLossPercent * 100),
            accountLossLimit: data.data.params.accountLossLimit,
            accountLossPercent: Math.round(data.data.params.accountLossPercent * 100),
            riskTolerance: data.data.params.riskTolerance,
          });
        }
      }
    } catch {} finally {
      setTradingLoading(false);
    }
  }, []);

  // 获取策略列表
  const fetchStrategies = useCallback(async () => {
    setStrategiesLoading(true);
    try {
      const res = await fetch('/api/config/strategies');
      const data = await res.json();
      if (data.success) {
        setStrategies({
          recommended: data.data.recommended || [],
          custom: data.data.custom || [],
          applied: data.data.applied || [],
        });
      }
    } catch {} finally {
      setStrategiesLoading(false);
    }
  }, []);

  // 获取通信渠道列表
  const fetchChannels = useCallback(async () => {
    setChannelsLoading(true);
    try {
      const res = await fetch('/api/config/channels');
      const data = await res.json();
      if (data.success) {
        setChannels(data.data || []);
      }
    } catch {} finally {
      setChannelsLoading(false);
    }
  }, []);

  // 获取行情数据
  const fetchMarketData = useCallback(async (symbol?: string) => {
    setMarketLoading(true);
    setMarketError(null);
    try {
      const sym = symbol || selectedSymbol;
      const res = await fetch(`/api/market/snapshot?symbol=${encodeURIComponent(sym)}`);
      const data = await res.json();
      if (data.success) {
        setMarketData(data.data);
      } else {
        setMarketError(data.error || '获取行情失败');
      }
    } catch (error) {
      setMarketError('网络错误，无法获取行情');
    } finally {
      setMarketLoading(false);
    }
  }, [selectedSymbol]);

  // 获取研报列表 - 默认只取A1/A2/A3/A6最新3份
  const fetchReportList = useCallback(async () => {
    setReportLoading(true);
    try {
      const res = await fetch('/api/reports?phases=A1,A2,A3,A6&latest=3');
      const data = await res.json();
      if (data.success) {
        setReportList(data.data);
      }
    } catch {} finally {
      setReportLoading(false);
    }
  }, []);

  // 获取研报内容
  const fetchReportContent = useCallback(async (filename: string) => {
    setReportContentLoading(true);
    try {
      const res = await fetch(`/api/reports?file=${encodeURIComponent(filename)}`);
      const data = await res.json();
      if (data.success) {
        setSelectedReport(data.data);
        setRightPanelContent('report');
      }
    } catch {} finally {
      setReportContentLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchLLMStatus();
    fetchApiConfigs();
    fetchTradingParams();
    fetchStrategies();
    fetchChannels();
    fetchMarketData();
    fetchReportList();
    // 每30秒刷新一次状态
    const interval = setInterval(fetchLLMStatus, 30000);
    // 每60秒刷新行情
    marketIntervalRef.current = setInterval(() => fetchMarketData(), 60000);
    // 每1小时刷新研报列表
    reportIntervalRef.current = setInterval(() => fetchReportList(), 3600000);
    return () => {
      clearInterval(interval);
      if (marketIntervalRef.current) clearInterval(marketIntervalRef.current);
      if (reportIntervalRef.current) clearInterval(reportIntervalRef.current);
    };
  }, [fetchLLMStatus, fetchApiConfigs, fetchTradingParams, fetchStrategies, fetchChannels, fetchMarketData, fetchReportList]);

  // ========== 监控面板 SSE 连接 ==========
  useEffect(() => {
    // 只在右面板切到 monitor 时连接
    if (rightPanelContent !== 'monitor') {
      if (monitorSSERef.current) {
        monitorSSERef.current.close();
        monitorSSERef.current = null;
      }
      return;
    }

    // 加载历史事件和统计
    const fetchMonitorData = async () => {
      try {
        const [eventsRes, statsRes] = await Promise.all([
          fetch('/api/monitor/events?limit=30'),
          fetch('/api/monitor/stats'),
        ]);
        const eventsData = await eventsRes.json();
        const statsData = await statsRes.json();
        if (eventsData.success) setMonitorEvents(eventsData.data);
        if (statsData.success) {
          setMonitorStats(statsData.data.stats);
          setMonitorPipeline(statsData.data.pipeline);
        }
      } catch {}
    };

    fetchMonitorData();

    // 建立 SSE 连接
    if (!monitorSSERef.current && !monitorPaused) {
      try {
        const es = new EventSource('/api/monitor/stream');
        es.onmessage = (e) => {
          try {
            const event = JSON.parse(e.data);
            if (event.type === 'connected') return; // 忽略连接确认
            setMonitorEvents(prev => [event, ...prev].slice(0, 100));
            // 更新 pipeline 和 stats（从事件推断）
            if (event.layer && event.phase) {
              fetch('/api/monitor/stats').then(r => r.json()).then(d => {
                if (d.success) {
                  setMonitorStats(d.data.stats);
                  setMonitorPipeline(d.data.pipeline);
                }
              }).catch(() => {});
            }
          } catch {}
        };
        es.onerror = () => {
          // SSE 断开，5s后重试
          es.close();
          monitorSSERef.current = null;
        };
        monitorSSERef.current = es;
      } catch {}
    }

    // 定期刷新统计
    const statsInterval = setInterval(fetchMonitorData, 10000);

    return () => {
      clearInterval(statsInterval);
      if (monitorSSERef.current) {
        monitorSSERef.current.close();
        monitorSSERef.current = null;
      }
    };
  }, [rightPanelContent, monitorPaused]);

  // 切换模型
  const switchModel = async (modelId: string) => {
    try {
      const res = await fetch(`/api/chat?action=set_model&model=${modelId}`);
      const data = await res.json();
      if (data.success) {
        setLlmModel(modelId);
        setLlmStatus('offline'); // 重置状态
        fetchLLMStatus(); // 立即检查新模型
      }
    } catch {}
  };

  // 切换识别方法
  const switchMethod = async (method: 'rule' | 'llm') => {
    try {
      const res = await fetch(`/api/chat?action=set_method&method=${method}`);
      const data = await res.json();
      if (data.success) {
        setIntentMethod(method);
      }
    } catch {}
  };

  // ========== 分析链路辅助函数 ==========
  
  /** 根据意图+思考模式初始化分析链路 */
  const initAnalysisChain = (intent: string, mode: 'quick' | 'deep') => {
    let steps: string[];
    if (mode === 'deep' && (intent === 'deep_analysis' || intent === 'scenario_sim')) {
      steps = ['A1_research', 'A2_analysis', 'A3_simulation', 'A4_validation'];
    } else {
      steps = INTENT_CHAIN_MAP[intent] || ['A1_research'];
    }
    
    const chain = steps.map((id, idx) => ({
      id,
      label: CHAIN_STEP_MAP[id]?.label || id,
      icon: CHAIN_STEP_MAP[id]?.icon || '📋',
      status: idx === 0 ? 'running' as const : 'idle' as const,
    }));
    
    setAnalysisChain(chain);
    setAnalysisStartTime(Date.now());
    setAnalysisIntent(intent);
    setAnalysisConfidence(null);
  };

  /** 标记某个步骤完成 */
  const markChainStep = (stepId: string, status: 'completed' | 'error', summary?: string) => {
    setAnalysisChain(prev => prev.map((step, idx) => {
      if (step.id === stepId) {
        return {
          ...step,
          status,
          summary: summary || step.summary,
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
      }
      return step;
    }));
    if (status === 'completed') {
      setAnalysisChain(prev => {
        const completedIdx = prev.findIndex(s => s.id === stepId);
        const next = prev[completedIdx + 1];
        if (next && next.status === 'idle') {
          return prev.map((s, i) => i === completedIdx + 1 ? { ...s, status: 'running' as const } : s);
        }
        return prev;
      });
    }
  };

  /** 模拟深度分析的分步进度（用于中台即时模式，在等待结果时展示动画） */
  const simulateDeepProgress = (steps: string[]) => {
    let currentStep = 0;
    const stepDurations = [2000, 3000, 2500, 2000]; // 每步模拟时长(ms)
    
    const advance = () => {
      if (currentStep >= steps.length) return;
      
      const stepId = steps[currentStep];
      setAnalysisChain(prev => prev.map((s, i) => {
        if (s.id === stepId && s.status === 'running') {
          return { ...s, status: 'completed' as const, timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
        }
        // 下一步开始
        if (s.status === 'idle' && i === currentStep + 1) {
          return { ...s, status: 'running' as const };
        }
        return s;
      }));
      
      currentStep++;
      if (currentStep < steps.length) {
        setTimeout(advance, stepDurations[currentStep] || 2000);
      } else {
        // 全部完成
        setAnalysisEndTime(Date.now());
      }
    };
    
    // 第一步延迟后标记完成
    setTimeout(advance, stepDurations[0] || 2000);
  };

  /** 清空分析链路 */
  const resetAnalysisChain = () => {
    setAnalysisChain([]);
    setAnalysisStartTime(null);
    setAnalysisEndTime(null);
    setAnalysisIntent('');
    setAnalysisConfidence(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);
    resetAnalysisChain(); // 清除上一轮分析链路

    if (workbuddyMode) {
      // ========== WorkBuddy 异步桥接模式 ==========
      await handleWorkbuddyTask(userMessage);
    } else {
      // ========== 原有同步Mock/LLM模式 ==========
      await handleDirectChat(userMessage);
    }
  };

  /**
   * WorkBuddy即时任务模式 v2.0
   * 中台即时触发：POST创建任务后直接返回结果（秒级），无需轮询
   * 回退：如果返回processing状态，仍然走轮询逻辑
   */
  const handleWorkbuddyTask = async (userMessage: string) => {
    const thinkingText = thinkingMode === 'quick' 
      ? "⏳ ⚡ 任务已发送，中台即时执行中..." 
      : "⏳ 🧠 深度任务已发送，中台即时执行中...";
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: thinkingText, intent: "thinking" },
    ]);

    // 🔗 初始化分析链路追踪
    initAnalysisChain('deep_analysis', thinkingMode);
    // 深度模式启动分步进度模拟
    if (thinkingMode === 'deep') {
      const deepSteps = ['A1_research', 'A2_analysis', 'A3_simulation', 'A4_validation'];
      simulateDeepProgress(deepSteps);
    }

    try {
      // Step 1: 创建任务并立即执行（v2.0 中台即时触发）
      const createRes = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          session_id: "dashboard-session",
          thinking_mode: thinkingMode,
          llm_model: llmModel,
          intent_method: intentMethod,
        }),
      });

      if (!createRes.ok) {
        if (createRes.status === 429) {
          throw new Error('任务队列已满，请等待当前任务完成');
        }
        throw new Error(`任务创建失败: ${createRes.status}`);
      }

      const createData = await createRes.json();
      const taskStatus = createData.data.status;
      const intentType = createData.data.intent?.type || createData.data.intent;
      const taskId = createData.data.task_id;

      // Step 2a: 同步完成（对话任务 / 交易待确认）→ 直接显示结果
      if (taskStatus === 'completed' && createData.data.content) {
        const content = createData.data.content;
        const artifacts = createData.data.artifacts_produced || [];
        const summary = createData.data.execution_summary;
        const isTrade = createData.data.trade_requires_confirmation;
        
        // 🔗 更新分析链路：根据实际执行的chain标记所有步骤完成
        if (summary?.chain_executed) {
          const executedChain = summary.chain_executed as string[];
          setAnalysisChain(prev => prev.map(step => {
            if (executedChain.includes(step.id)) {
              const artifact = artifacts?.find((a: any) => a.chain_phase === step.id.replace('_research','').replace('_analysis','').replace('_simulation','').replace('_validation','').replace('_execution','').replace('_intel',''));
              return {
                ...step,
                status: 'completed' as const,
                summary: artifact ? `${artifact.chain_phase}: ${artifact.file?.split('/').pop()}` : undefined,
                timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              };
            }
            // 未执行的步骤标为idle
            if (step.status === 'running') {
              return { ...step, status: 'completed' as const, timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
            }
            return step;
          }));
          // 标记剩余running步骤完成
          setAnalysisChain(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'completed' as const, timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) } : s));
          setAnalysisEndTime(Date.now());
        }
        if (createData.data.intent?.confidence) {
          setAnalysisConfidence(createData.data.intent.confidence);
        }
        
        let resultContent = content;
        if (artifacts.length > 0) {
          resultContent += `\n\n📎 生成产物: ${artifacts.map((a: any) => `${a.chain_phase}: ${a.file}`).join(' | ')}`;
        }
        if (summary) {
          resultContent += `\n🔗 执行链路: ${summary.chain_executed?.join(' → ') || 'N/A'}`;
        }

        setMessages((prev) => {
          const filtered = prev.filter((m) => m.intent !== "thinking");
          return [
            ...filtered,
            {
              role: "assistant",
              content: resultContent,
              intent: isTrade ? 'execute_trade' : intentType,
              confidence: createData.data.intent?.confidence,
              thinking_mode: thinkingMode,
              chain: summary?.chain_executed || [],
              trade_task_id: isTrade ? taskId : undefined,
              trade_confirmed: false,
            },
          ];
        });
        setIsLoading(false);
        return;
      }

      // Step 2b: 异步执行（回退模式）→ 轮询结果
      if (taskStatus === 'processing') {
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.intent !== "thinking");
          return [
            ...filtered,
            {
              role: "assistant",
              content: `🔄 任务已创建(异步模式)\n\n📋 任务ID: ${taskId}\n🎯 意图: ${intentType}\n\nWorkBuddy正在异步执行...`,
              intent: "thinking",
              thinking_mode: thinkingMode,
            },
          ];
        });

        const pollInterval = 3000;
        const maxPollTime = 5 * 60 * 1000;
        const startTime = Date.now();

        while (Date.now() - startTime < maxPollTime) {
          await new Promise(r => setTimeout(r, pollInterval));

          const pollRes = await fetch(`/api/task?id=${taskId}`);
          if (!pollRes.ok) continue;

          const pollData = await pollRes.json();
          const pollStatus = pollData.data.status;

          if (pollStatus === 'completed') {
            const content = pollData.data.content || '执行完成，但未返回内容';
            const artifacts = pollData.data.artifacts_produced || [];
            const summary = pollData.data.execution_summary;
            
            // 🔗 更新分析链路：标记全部完成
            if (summary?.chain_executed) {
              const executedChain = summary.chain_executed as string[];
              setAnalysisChain(prev => prev.map(step => {
                if (executedChain.includes(step.id)) {
                  return { ...step, status: 'completed' as const, timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
                }
                if (step.status === 'running') {
                  return { ...step, status: 'completed' as const, timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
                }
                return step;
              }));
            } else {
              setAnalysisChain(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'completed' as const, timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) } : s));
            }
            if (pollData.data.intent?.confidence) setAnalysisConfidence(pollData.data.intent.confidence);
            
            let resultContent = content;
            if (artifacts.length > 0) {
              resultContent += `\n\n📎 生成产物: ${artifacts.map((a: any) => `${a.chain_phase}: ${a.file}`).join(' | ')}`;
            }
            if (summary) {
              resultContent += `\n🔗 执行链路: ${summary.chain_executed?.join(' → ') || 'N/A'}`;
            }

            setMessages((prev) => {
              const filtered = prev.filter((m) => m.intent !== "thinking");
              return [
                ...filtered,
                {
                  role: "assistant",
                  content: resultContent,
                  intent: intentType,
                  confidence: pollData.data.intent?.confidence,
                  thinking_mode: thinkingMode,
                  chain: summary?.chain_executed || [],
                },
              ];
            });
            setIsLoading(false);
            return;
          }

          if (pollStatus === 'failed') {
            setMessages((prev) => {
              const filtered = prev.filter((m) => m.intent !== "thinking");
              return [
                ...filtered,
                {
                  role: "assistant",
                  content: `❌ 任务执行失败\n\n📋 任务ID: ${taskId}\n💥 错误: ${pollData.data.error || '未知错误'}`,
                  intent: "error",
                },
              ];
            });
            setIsLoading(false);
            return;
          }

          if (pollStatus === 'timeout') {
            setMessages((prev) => {
              const filtered = prev.filter((m) => m.intent !== "thinking");
              return [
                ...filtered,
                {
                  role: "assistant",
                  content: `⏰ 任务超时\n\n可以切换到「直接模式」获取即时响应。`,
                  intent: "timeout",
                },
              ];
            });
            setIsLoading(false);
            return;
          }
        }

        // 轮询超时
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.intent !== "thinking");
          return [
            ...filtered,
            {
              role: "assistant",
              content: `⏰ 等待超时（5分钟）\n\n任务仍在后台执行，你可以稍后查看结果。\n💡 提示：切换到「直接模式」可获取即时响应。`,
              intent: "timeout",
            },
          ];
        });
      }
    } catch (error) {
      console.error("WorkBuddy task error:", error);
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.intent !== "thinking");
        return [
          ...filtered,
          {
            role: "assistant",
            content: `❌ 任务请求失败：${error instanceof Error ? error.message : "未知错误"}\n\n可以切换到「直接模式」或稍后重试。`,
            intent: "error",
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 原有同步模式（作为fallback）
   */
  const handleDirectChat = async (userMessage: string) => {
    const thinkingText = thinkingMode === 'quick' 
      ? "⏳ ⚡ 快速思考中..." 
      : "⏳ 🧠 深度思考中...";
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: thinkingText, intent: "thinking" },
    ]);

    // 🔗 初始化分析链路追踪
    initAnalysisChain('deep_analysis', thinkingMode);
    if (thinkingMode === 'deep') {
      const deepSteps = ['A1_research', 'A2_analysis', 'A3_simulation', 'A4_validation'];
      simulateDeepProgress(deepSteps);
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          session_id: "demo-session",
          thinking_mode: thinkingMode,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.data?.llm_status) setLlmStatus(result.data.llm_status);
      if (result.data?.llm_model) setLlmModel(result.data.llm_model);
      if (result.data?.intent_method) setIntentMethod(result.data.intent_method);

      // 🔗 根据返回的chain更新分析链路
      const returnedChain = result.data?.chain || [];
      if (returnedChain.length > 0) {
        setAnalysisChain(prev => prev.map(step => {
          if (returnedChain.includes(step.id)) {
            return {
              ...step,
              status: 'completed' as const,
              timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            };
          }
          if (step.status === 'running') {
            return { ...step, status: 'completed' as const, timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
          }
          return step;
        }));
      } else {
        // 无chain信息，全部标记完成
        setAnalysisChain(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'completed' as const, timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) } : s));
        setAnalysisEndTime(Date.now());
      }
      if (result.data?.confidence) setAnalysisConfidence(result.data.confidence);

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.intent !== "thinking");
        return [
          ...filtered,
          {
            role: "assistant",
            content: result.data?.content || "抱歉，我没有收到有效响应。",
            intent: result.data?.intent || "unknown",
            confidence: result.data?.confidence,
            context_aware: result.data?.context_aware || false,
            chain: result.data?.chain || [],
            thinking_mode: result.data?.thinking_mode || thinkingMode,
          },
        ];
      });
    } catch (error) {
      console.error("Chat API error:", error);
      // 🔗 错误时标记当前running步骤为error
      setAnalysisChain(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' as const } : s));
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.intent !== "thinking");
        return [
          ...filtered,
          {
            role: "assistant",
            content: `❌ 请求失败：${error instanceof Error ? error.message : "未知错误"}\n\n请检查网络连接或稍后重试。`,
            intent: "error",
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ========== 交易确认交互 ==========
  const [scheduleTime, setScheduleTime] = useState('');

  /**
   * 交易确认/定时/取消
   */
  const handleTradeConfirm = async (taskId: string, action: 'confirm' | 'schedule' | 'cancel') => {
    try {
      const body: Record<string, unknown> = { task_id: taskId, action };
      if (action === 'schedule') {
        if (!scheduleTime) {
          alert('请输入定时时间（格式：HH:MM，如 14:30）');
          return;
        }
        // 将今天的日期与输入的时间组合为ISO8601
        const today = new Date().toISOString().slice(0, 10);
        body.scheduled_time = `${today}T${scheduleTime}:00`;
      }

      const res = await fetch('/api/task/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `请求失败: ${res.status}`);
      }

      const data = await res.json();

      // 更新消息状态
      setMessages((prev) => prev.map((m) => {
        if (m.trade_task_id === taskId) {
          return {
            ...m,
            trade_confirmed: true,
            content: action === 'confirm'
              ? `✅ **交易已确认执行**\n\n${data.data.chain ? '🔗 链路: ' + data.data.chain.join(' → ') : ''}\n\n${data.data.message || ''}`
              : action === 'schedule'
              ? `🕐 **交易已定时**\n\n⏰ 执行时间: ${data.data.scheduled_time || scheduleTime}\n\n${data.data.message || ''}`
              : `🚫 **交易已取消**\n\n${data.data.message || ''}`,
          };
        }
        return m;
      }));

      setScheduleTime('');
    } catch (error) {
      console.error('Trade confirm error:', error);
      alert(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleShowRightPanel = (type: RightPanelType) => {
    setRightPanelContent(type);
    setRightCollapsed(false);
  };

  // LLM 状态指示灯
  const renderStatusDot = (status: 'online' | 'offline' | 'degraded') => {
    const config = {
      online: { color: 'bg-green-500', text: '在线', textColor: 'text-green-500' },
      offline: { color: 'bg-red-500', text: '离线', textColor: 'text-red-500' },
      degraded: { color: 'bg-yellow-500', text: '降级', textColor: 'text-yellow-500' },
    };
    const c = config[status];
    return (
      <span className={`flex items-center gap-1 ${c.textColor}`}>
        <span className={`w-2 h-2 ${c.color} rounded-full animate-pulse`} />
        <span className="text-xs">{c.text}</span>
      </span>
    );
  };

  const renderRightPanel = () => {
    switch (rightPanelContent) {
      case 'llm':
        return (
          <div>
            <div className="panel-title">🤖 大模型配置</div>
            
            {/* 状态总览 */}
            <div className="config-section">
              <div className="font-semibold mb-2">📊 服务状态</div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#a1a1aa]">LLM 连接</span>
                {renderStatusDot(llmStatus)}
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#a1a1aa]">当前模型</span>
                <span className="text-xs text-[#3b82f6] font-semibold">{llmModel}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#a1a1aa]">识别方法</span>
                <span className={`text-xs font-semibold ${intentMethod === 'llm' ? 'text-green-500' : 'text-yellow-500'}`}>
                  {intentMethod === 'llm' ? '🧠 LLM' : '📋 规则'}
                </span>
              </div>
              {llmStatus === 'degraded' && (
                <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-500">
                  ⚠️ 免费额度已用完，已降级为规则识别。请在百炼控制台关闭"仅使用免费额度"。
                </div>
              )}
              {llmStatus === 'offline' && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500">
                  ❌ LLM 不可用，请检查网络或API配置。
                </div>
              )}
            </div>
            
            {/* 模型选择 */}
            <div className="config-section">
              <div className="font-semibold mb-2">🔧 模型选择</div>
              <div className="space-y-1.5">
                {QWEN_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => switchModel(model.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-xs transition ${
                      llmModel === model.id
                        ? 'bg-[#3b82f6] text-white'
                        : 'bg-[#0f1729] text-[#a1a1aa] hover:bg-[#0f3460] hover:text-[#e4e4e7]'
                    }`}
                  >
                    <div className="font-semibold">{model.name}</div>
                    <div className={`${llmModel === model.id ? 'text-white/70' : 'text-[#a1a1aa]'}`}>{model.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* 识别方法切换 */}
            <div className="config-section">
              <div className="font-semibold mb-2">🧠 识别方法</div>
              <div className="flex gap-2">
                <button
                  onClick={() => switchMethod('llm')}
                  className={`flex-1 px-3 py-2 text-xs rounded-md transition ${
                    intentMethod === 'llm'
                      ? 'bg-[#3b82f6] text-white'
                      : 'bg-[#0f1729] text-[#a1a1aa] hover:bg-[#0f3460]'
                  }`}
                >
                  🧠 LLM识别
                </button>
                <button
                  onClick={() => switchMethod('rule')}
                  className={`flex-1 px-3 py-2 text-xs rounded-md transition ${
                    intentMethod === 'rule'
                      ? 'bg-[#eab308] text-black'
                      : 'bg-[#0f1729] text-[#a1a1aa] hover:bg-[#0f3460]'
                  }`}
                >
                  📋 规则识别
                </button>
              </div>
              <div className="text-xs text-[#a1a1aa] mt-2">
                {intentMethod === 'llm' 
                  ? '使用大模型进行意图识别，更精准但消耗API额度'
                  : '基于关键词规则匹配，不消耗API额度'}
              </div>
            </div>
            
            {/* API 配置 */}
            <div className="config-section">
              <div className="font-semibold mb-2">🔑 API Key</div>
              <div className="text-xs text-[#a1a1aa] mb-2">
                <div>Key: sk-***•••***8cb8 <span className="text-[#3b82f6] cursor-pointer">[👁]</span></div>
                <div>Endpoint: dashscope.aliyuncs.com</div>
              </div>
              <button 
                onClick={fetchLLMStatus}
                className="px-3 py-1.5 text-xs bg-[#3b82f6] text-white rounded hover:bg-blue-600 transition"
              >
                🔄 测试连接
              </button>
            </div>
          </div>
        );
      case 'market':
        return (
          <div>
            <div className="panel-title">📈 行情卡片</div>

            {/* 交易对选择器 */}
            <div className="flex gap-1.5 mb-3">
              {['BTC', 'ETH', 'SOL'].map((sym) => (
                <button
                  key={sym}
                  onClick={() => {
                    const swapSymbol = `${sym}-USDT-SWAP`;
                    setSelectedSymbol(swapSymbol);
                    fetchMarketData(swapSymbol);
                  }}
                  className={`px-3 py-1.5 text-xs rounded-md transition ${
                    selectedSymbol === `${sym}-USDT-SWAP`
                      ? 'bg-[#3b82f6] text-white'
                      : 'bg-[#0f1729] text-[#a1a1aa] hover:bg-[#0f3460]'
                  }`}
                >
                  {sym}
                </button>
              ))}
              <button
                onClick={() => fetchMarketData()}
                className="px-2 py-1.5 text-xs bg-[#0f1729] text-[#3b82f6] rounded-md hover:bg-[#0f3460] transition"
                title="刷新数据"
              >
                🔄
              </button>
            </div>

            {/* 行情数据 */}
            {marketLoading && !marketData ? (
              <div className="data-card">
                <div className="data-card-title">📊 {selectedSymbol}</div>
                <div className="data-card-content">
                  <span className="text-[#a1a1aa]">⏳ 加载中...</span>
                </div>
              </div>
            ) : marketError ? (
              <div className="data-card">
                <div className="data-card-title">📊 {selectedSymbol}</div>
                <div className="data-card-content">
                  <span className="text-red-500">❌ {marketError}</span>
                </div>
              </div>
            ) : marketData ? (
              <div className="data-card">
                <div className="data-card-title">📊 {marketData.symbol}</div>
                <div className="data-card-content">
                  {marketData.price ? (
                    <>
                      <div className="text-xl font-bold mb-1">
                        ${typeof marketData.price === 'number' ? marketData.price.toLocaleString() : marketData.price}
                        {marketData.change24h !== undefined && marketData.change24h !== null && (
                          <span className={`text-sm ml-2 ${marketData.change24h >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {marketData.change24h >= 0 ? '▲' : '▼'} {Math.abs(marketData.change24h).toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-[#a1a1aa]">
                        {marketData.open24h && <div>开盘: ${typeof marketData.open24h === 'number' ? marketData.open24h.toLocaleString() : marketData.open24h}</div>}
                        {marketData.high24h && <div>24h高: <span className="text-red-400">${typeof marketData.high24h === 'number' ? marketData.high24h.toLocaleString() : marketData.high24h}</span></div>}
                        {marketData.low24h && <div>24h低: <span className="text-green-400">${typeof marketData.low24h === 'number' ? marketData.low24h.toLocaleString() : marketData.low24h}</span></div>}
                        {marketData.volume24h && (
                          <div>24h量: {(() => {
                            const v = parseFloat(String(marketData.volume24h).replace(/,/g, ''));
                            if (isNaN(v)) return marketData.volume24h;
                            if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
                            if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
                            if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
                            return v.toFixed(0);
                          })()}</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-[#a1a1aa]">数据解析中，请刷新重试</div>
                  )}
                  {marketData.fundingRate && (
                    <div className="mt-1 text-xs">
                      资金费率: <span className={parseFloat(marketData.fundingRate) >= 0 ? 'text-red-500' : 'text-green-500'}>
                        {parseFloat(marketData.fundingRate) >= 0 ? '+' : ''}
                        {(parseFloat(marketData.fundingRate) * 100).toFixed(4)}%
                      </span>
                    </div>
                  )}
                  {marketData.positions && marketData.positions.length > 0 ? (
                    <div className="mt-2">
                      <div className="text-[#3b82f6] font-semibold">持仓信息:</div>
                      {marketData.positions.map((pos, idx) => (
                        <div key={idx} className="mt-1">
                          {Boolean(pos.symbol) && <span>{String(pos.symbol)}</span>}
                          {Boolean(pos.side) && <span> | {String(pos.side)}</span>}
                          {Boolean(pos.leverage) && <span> | {String(pos.leverage)}x</span>}
                          {pos.upl !== undefined && <span className={Number(pos.upl) >= 0 ? 'text-red-500' : 'text-green-500'}> | UPL: {String(pos.upl)}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-1">持仓: <span className="text-[#a1a1aa]">空仓</span></div>
                  )}
                  <div className="text-[10px] text-[#555] mt-2">
                    更新: {marketData.timestamp ? new Date(marketData.timestamp).toLocaleTimeString('zh-CN') : 'N/A'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="data-card">
                <div className="data-card-title">📊 {selectedSymbol}</div>
                <div className="data-card-content text-[#a1a1aa]">暂无数据</div>
              </div>
            )}

            {/* 行情查询 */}
            <div className="config-section mt-3">
              <div className="font-semibold mb-2">🔍 自定义查询</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="如: DOGE, XRP-USDT"
                  className="flex-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6] transition"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) {
                        const symbol = val.includes('-') ? val.toUpperCase() : `${val.toUpperCase()}-USDT-SWAP`;
                        setSelectedSymbol(symbol);
                        fetchMarketData(symbol);
                      }
                    }
                  }}
                />
                <button
                  onClick={() => fetchMarketData()}
                  className="px-3 py-1.5 text-xs bg-[#3b82f6] text-white rounded-md hover:bg-blue-600 transition"
                >
                  查询
                </button>
              </div>
            </div>
          </div>
        );
      case 'signal':
        return (
          <div>
            <div className="panel-title">🎯 评分卡片</div>
            <div className="data-card">
              <div className="data-card-title">🎯 交易评分</div>
              <div className="data-card-content">
                总分: <span className="text-red-500 font-semibold">12/80</span> → 偏空<br />
                优势评分: -35 (强空方优势)<br />
                宏观: 3/10 (CPI超预期)<br />
                技术: 5/10 (关键均线下方)<br />
                情绪: 4/10 (恐惧持续)<br />
                <span className="text-yellow-500">建议: 观望为主，谨慎做空</span>
              </div>
            </div>
          </div>
        );
      case 'position':
        return (
          <div>
            <div className="panel-title">💼 持仓卡片</div>
            <div className="data-card">
              <div className="data-card-title">💼 当前持仓</div>
              <div className="data-card-content">
                状态: <span className="text-[#a1a1aa]">空仓</span><br />
                <span className="text-green-500">OR</span><br />
                方向: 做多 | 杠杆: 2x<br />
                未实现盈亏: <span className="text-green-500">+$140.5</span>
              </div>
            </div>
          </div>
        );
      case 'api':
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="panel-title" style={{ marginBottom: 0 }}>⚙️ API配置</div>
              <button
                onClick={() => setShowAddApiForm(!showAddApiForm)}
                className="px-3 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition font-medium"
              >
                ➕ 添加
              </button>
            </div>

            {/* 添加API表单 */}
            {showAddApiForm && (
              <div className="config-section" style={{ borderLeft: '3px solid #22c55e' }}>
                <div className="font-semibold mb-2">➕ 新增API配置</div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-[#a1a1aa]">类别</label>
                    <select
                      value={addApiForm.category}
                      onChange={(e) => setAddApiForm({ ...addApiForm, category: e.target.value })}
                      className="w-full mt-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                    >
                      <option value="EXCHANGE">交易所</option>
                      <option value="LLM">AI模型</option>
                      <option value="DATA_SOURCE">数据源</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#a1a1aa]">提供商</label>
                    <select
                      value={addApiForm.provider}
                      onChange={(e) => setAddApiForm({ ...addApiForm, provider: e.target.value })}
                      className="w-full mt-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                    >
                      <option value="okx">OKX</option>
                      <option value="openai">OpenAI</option>
                      <option value="dashscope">百炼/DashScope</option>
                      <option value="coinglass">CoinGlass</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#a1a1aa]">标签</label>
                    <input
                      value={addApiForm.label}
                      onChange={(e) => setAddApiForm({ ...addApiForm, label: e.target.value })}
                      placeholder="如: 主账户"
                      className="w-full mt-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#a1a1aa]">API Key</label>
                    <input
                      value={addApiForm.apiKey}
                      onChange={(e) => setAddApiForm({ ...addApiForm, apiKey: e.target.value })}
                      placeholder="输入API Key"
                      type="password"
                      className="w-full mt-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#a1a1aa]">Secret Key</label>
                    <input
                      value={addApiForm.secretKey}
                      onChange={(e) => setAddApiForm({ ...addApiForm, secretKey: e.target.value })}
                      placeholder="输入Secret Key"
                      type="password"
                      className="w-full mt-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                  {addApiForm.provider === 'okx' && (
                    <div>
                      <label className="text-xs text-[#a1a1aa]">Passphrase</label>
                      <input
                        value={addApiForm.passphrase}
                        onChange={(e) => setAddApiForm({ ...addApiForm, passphrase: e.target.value })}
                        placeholder="输入Passphrase"
                        type="password"
                        className="w-full mt-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-[#a1a1aa]">环境</label>
                    <select
                      value={addApiForm.environment}
                      onChange={(e) => setAddApiForm({ ...addApiForm, environment: e.target.value })}
                      className="w-full mt-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                    >
                      <option value="demo">Demo模拟盘</option>
                      <option value="live">Live实盘</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/config/api-keys', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(addApiForm),
                          });
                          const data = await res.json();
                          if (data.success) {
                            setShowAddApiForm(false);
                            setAddApiForm({ category: 'EXCHANGE', provider: 'okx', label: '', apiKey: '', secretKey: '', passphrase: '', environment: 'demo' });
                            fetchApiConfigs();
                          } else {
                            alert(data.error || '添加失败');
                          }
                        } catch (error) {
                          alert('添加失败: ' + (error instanceof Error ? error.message : '未知错误'));
                        }
                      }}
                      className="flex-1 px-3 py-2 text-xs bg-[#3b82f6] text-white rounded-md hover:bg-blue-600 transition font-medium"
                    >
                      💾 保存
                    </button>
                    <button
                      onClick={() => setShowAddApiForm(false)}
                      className="px-3 py-2 text-xs bg-[#2a2a4e] text-[#a1a1aa] rounded-md hover:bg-[#1a1a2e] transition"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* API配置列表 */}
            {apiConfigs.length === 0 ? (
              <div className="config-section text-center">
                <div className="text-xs text-[#a1a1aa] mb-2">暂无API配置</div>
                <div className="text-xs text-[#a1a1aa]">点击上方"➕ 添加"按钮添加新的API配置</div>
              </div>
            ) : (
              apiConfigs.map((config) => (
                <div key={config.id} className="config-section">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-semibold">{config.provider.toUpperCase()}</div>
                    <div className="flex gap-1.5 items-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        config.environment === 'live' ? 'bg-red-500/20 text-red-400' : 'bg-green-500 text-black'
                      }`}>
                        {config.environment === 'live' ? '● Live' : '● Demo'}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-[#a1a1aa] mb-1">
                    <span className="text-[#3b82f6]">{config.label}</span> | {config.category}
                  </div>
                  <div className="text-xs mb-2">
                    <div>API Key: {config.keyHint || '•••••••'} <span className="text-[#3b82f6] cursor-pointer">[👁]</span></div>
                  </div>
                  {config.isVerified ? (
                    <div className="text-green-500 text-xs mb-2">
                      ✅ 已验证 {config.lastVerifiedAt ? `(${new Date(config.lastVerifiedAt).toLocaleDateString('zh-CN')})` : ''}
                    </div>
                  ) : (
                    <div className="text-yellow-500 text-xs mb-2">⚠️ 未验证</div>
                  )}
                  {/* 测试结果显示 */}
                  {apiTestResult && apiTestResult[config.id] && (
                    <div className={`text-xs mb-2 p-2 rounded ${
                      apiTestResult[config.id].success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {apiTestResult[config.id].success ? '✅' : '❌'} {apiTestResult[config.id].message}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        setApiTesting(config.id);
                        try {
                          const res = await fetch('/api/config/api-keys/test', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ configId: config.id, provider: config.provider, environment: config.environment }),
                          });
                          const data = await res.json();
                          setApiTestResult(prev => ({
                            ...prev,
                            [config.id]: data.data || { success: false, message: data.error || '测试失败' }
                          }));
                          if (data.success && data.data?.success) {
                            fetchApiConfigs(); // 刷新验证状态
                          }
                        } catch {} finally {
                          setApiTesting(null);
                        }
                      }}
                      disabled={apiTesting === config.id}
                      className="px-3 py-1.5 text-xs bg-[#3b82f6] text-white rounded hover:bg-blue-600 transition disabled:opacity-50"
                    >
                      {apiTesting === config.id ? '⏳ 测试中...' : '测试连接'}
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm('确定删除此API配置？')) return;
                        try {
                          await fetch(`/api/config/api-keys?id=${config.id}`, { method: 'DELETE' });
                          fetchApiConfigs();
                        } catch {}
                      }}
                      className="px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case 'trading':
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="panel-title" style={{ marginBottom: 0 }}>💰 交易设置</div>
              <button
                onClick={() => setTradingEditing(!tradingEditing)}
                className={`px-3 py-1.5 text-xs rounded transition font-medium ${
                  tradingEditing ? 'bg-[#3b82f6] text-white' : 'bg-[#2a2a4e] text-[#e4e4e7] border border-[#3b82f6]'
                }`}
              >
                {tradingEditing ? '✕ 取消' : '✏️ 编辑'}
              </button>
            </div>

            {tradingLoading && !tradingParams ? (
              <div className="config-section text-center text-xs text-[#a1a1aa]">⏳ 加载中...</div>
            ) : tradingParams ? (
              <>
                {/* 关联交易所 */}
                <div className="config-section">
                  <div className="font-semibold mb-2">🔗 关联交易所</div>
                  {tradingParams.exchangeStatus ? (
                    <>
                      <div className={`text-xs mb-1 ${tradingParams.exchangeStatus.isVerified ? 'text-green-500' : 'text-yellow-500'}`}>
                        {tradingParams.exchangeStatus.isVerified ? '●' : '○'} {tradingParams.exchangeStatus.provider.toUpperCase()} ({tradingParams.exchangeStatus.environment === 'live' ? 'Live' : 'Demo'}) {tradingParams.exchangeStatus.isVerified ? '已验证 ✅' : '未验证 ⚠️'}
                      </div>
                      <div className="text-xs text-[#a1a1aa]">品种: {tradingParams.params.allowedSymbols.join(', ')}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs text-yellow-500 mb-1">○ 未配置交易所API</div>
                      <button
                        onClick={() => setRightPanelContent('api')}
                        className="text-xs text-[#3b82f6] hover:underline mt-1"
                      >
                        → 前往API配置
                      </button>
                    </>
                  )}
                </div>

                {/* 交易可用资金 */}
                <div className="config-section">
                  <div className="font-semibold mb-2">💵 交易可用资金</div>
                  {tradingEditing ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-[#a1a1aa]">可用余额 (USDT)</label>
                        <input
                          type="number"
                          value={tradingEditForm.availableCapital as string || ''}
                          onChange={(e) => setTradingEditForm({ ...tradingEditForm, availableCapital: e.target.value ? parseFloat(e.target.value) : '' })}
                          className="w-full mt-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                          placeholder="输入可用余额"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-lg font-semibold text-[#3b82f6]">
                        {tradingParams.params.availableCapital != null ? `${tradingParams.params.availableCapital.toLocaleString()} USDT` : '未设置'}
                      </div>
                      <div className="text-xs text-[#a1a1aa] mt-1">
                        每次交易: {Math.round(tradingParams.params.capitalPercentage * 100)}% 账户余额
                      </div>
                    </>
                  )}
                  <div className="text-xs text-[#a1a1aa] mt-2">ℹ️ 百分比由系统统一设定，确保策略一致性</div>
                </div>

                {/* 交易模式 */}
                <div className="config-section">
                  <div className="font-semibold mb-2">🔄 交易模式</div>
                  {tradingEditing ? (
                    <>
                      {/* 交易模式选择 - 标签式 */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(['SPOT_MODE', 'SWAP_MODE'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setTradingEditForm({ ...tradingEditForm, tradeMode: mode })}
                            className={`px-3 py-1.5 text-xs rounded transition font-medium ${
                              tradingEditForm.tradeMode === mode
                                ? 'bg-[#3b82f6] text-white'
                                : 'bg-[#0f1729] text-[#a1a1aa] border border-[#2a2a4e] hover:border-[#3b82f6]'
                            }`}
                          >
                            {mode === 'SPOT_MODE' ? '💰 现货' : '⚡ 合约'}
                          </button>
                        ))}
                      </div>
                      {/* 合约模式特有设置 */}
                      {tradingEditForm.tradeMode !== 'SPOT_MODE' && (
                        <div className="space-y-2 pl-2 border-l-2 border-[#3b82f6]/30">
                          <div>
                            <label className="text-xs text-[#a1a1aa]">保证金模式</label>
                            <select
                              value={tradingEditForm.marginMode as string || 'CROSS'}
                              onChange={(e) => setTradingEditForm({ ...tradingEditForm, marginMode: e.target.value })}
                              className="w-full mt-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                            >
                              <option value="CROSS">全仓 (Cross)</option>
                              <option value="ISOLATED">逐仓 (Isolated)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-[#a1a1aa]">持仓模式</label>
                            <select
                              value={tradingEditForm.positionMode as string || 'NET'}
                              onChange={(e) => setTradingEditForm({ ...tradingEditForm, positionMode: e.target.value })}
                              className="w-full mt-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                            >
                              <option value="NET">净仓 (One-way)</option>
                              <option value="HEDGE">逐仓双向 (Hedge)</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-1 text-xs rounded font-medium ${
                          tradingParams.params.tradeMode === 'SPOT_MODE'
                            ? 'bg-[#3b82f6] text-white'
                            : 'bg-[#eab308]/20 text-[#eab308]'
                        }`}>
                          {tradingParams.params.tradeMode === 'SPOT_MODE' ? '💰 现货' : '⚡ 合约'}
                        </span>
                        <span className="text-xs text-[#a1a1aa]">
                          {tradingParams.params.tradeType}
                        </span>
                      </div>
                      {tradingParams.params.tradeMode !== 'SPOT_MODE' && (
                        <div className="text-xs text-[#a1a1aa] space-y-0.5 pl-2">
                          <div>保证金: {tradingParams.params.marginMode === 'ISOLATED' ? '逐仓' : '全仓'}</div>
                          <div>持仓模式: {tradingParams.params.positionMode === 'HEDGE' ? '逐仓双向' : '净仓'}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* 杠杆设置 */}
                <div className="config-section">
                  <div className="font-semibold mb-2">⚡ 杠杆设置</div>
                  {tradingEditing ? (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#a1a1aa]">1x</span>
                        <span className="text-sm font-semibold text-[#3b82f6]">{String(tradingEditForm.leverageMax)}x</span>
                        <span className="text-xs text-[#a1a1aa]">5x</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={tradingEditForm.leverageMax as number}
                        onChange={(e) => setTradingEditForm({ ...tradingEditForm, leverageMax: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-[#2a2a4e] rounded-lg appearance-none cursor-pointer accent-[#3b82f6]"
                      />
                      {(tradingEditForm.leverageMax as number) >= 3 && (
                        <div className={`mt-2 p-2 rounded text-xs ${
                          (tradingEditForm.leverageMax as number) >= 5 ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30'
                        }`}>
                          ⚠️ {(tradingEditForm.leverageMax as number) >= 5 ? '5x杠杆风险极高！' : `${tradingEditForm.leverageMax}x杠杆风险较高`}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-[#2a2a4e] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${((tradingParams.params.leverageMax - 1) / 4) * 100}%`,
                            backgroundColor: tradingParams.params.leverageMax >= 5 ? '#ef4444' : tradingParams.params.leverageMax >= 3 ? '#eab308' : '#3b82f6',
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-[#3b82f6] min-w-[36px] text-right">{tradingParams.params.leverageMax}x</span>
                    </div>
                  )}
                </div>

                {/* 亏损限制 */}
                <div className="config-section">
                  <div className="font-semibold mb-2">🛡️ 亏损限制</div>
                  {tradingEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-[#a1a1aa]">日亏损限制</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="number"
                            value={tradingEditForm.dailyLossLimit as number}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setTradingEditForm({
                                ...tradingEditForm,
                                dailyLossLimit: val,
                                dailyLossPercent: tradingParams?.params?.availableCapital ? Math.round((val / tradingParams.params.availableCapital) * 10000) / 100 : tradingEditForm.dailyLossPercent,
                              });
                            }}
                            className="flex-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                          />
                          <span className="text-xs text-[#a1a1aa] self-center">USDT /</span>
                          <input
                            type="number"
                            value={tradingEditForm.dailyLossPercent as number}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setTradingEditForm({
                                ...tradingEditForm,
                                dailyLossPercent: val,
                                dailyLossLimit: tradingParams?.params?.availableCapital ? Math.round(tradingParams.params.availableCapital * val / 100 * 100) / 100 : tradingEditForm.dailyLossLimit,
                              });
                            }}
                            className="w-16 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                          />
                          <span className="text-xs text-[#a1a1aa] self-center">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-[#a1a1aa]">账户亏损限制</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="number"
                            value={tradingEditForm.accountLossLimit as number}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setTradingEditForm({
                                ...tradingEditForm,
                                accountLossLimit: val,
                                accountLossPercent: tradingParams?.params?.availableCapital ? Math.round((val / tradingParams.params.availableCapital) * 10000) / 100 : tradingEditForm.accountLossPercent,
                              });
                            }}
                            className="flex-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                          />
                          <span className="text-xs text-[#a1a1aa] self-center">USDT /</span>
                          <input
                            type="number"
                            value={tradingEditForm.accountLossPercent as number}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setTradingEditForm({
                                ...tradingEditForm,
                                accountLossPercent: val,
                                accountLossLimit: tradingParams?.params?.availableCapital ? Math.round(tradingParams.params.availableCapital * val / 100 * 100) / 100 : tradingEditForm.accountLossLimit,
                              });
                            }}
                            className="w-16 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                          />
                          <span className="text-xs text-[#a1a1aa] self-center">%</span>
                        </div>
                      </div>
                      <div className="text-xs text-[#a1a1aa]">ℹ️ 绝对金额与百分比两个维度取更严格值</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#a1a1aa]">日亏损限制</span>
                        <span className="text-xs text-[#e4e4e7] font-medium">{tradingParams.params.dailyLossLimit} USDT / {Math.round(tradingParams.params.dailyLossPercent * 100)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#a1a1aa]">账户亏损限制</span>
                        <span className="text-xs text-[#e4e4e7] font-medium">{tradingParams.params.accountLossLimit} USDT / {Math.round(tradingParams.params.accountLossPercent * 100)}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 风险偏好 */}
                <div className="config-section">
                  <div className="font-semibold mb-2">🎯 风险偏好</div>
                  {tradingEditing ? (
                    <div className="flex gap-1.5">
                      {(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'] as const).map((tol) => (
                        <button
                          key={tol}
                          onClick={() => setTradingEditForm({ ...tradingEditForm, riskTolerance: tol })}
                          className={`flex-1 px-2 py-1.5 text-xs rounded transition font-medium ${
                            tradingEditForm.riskTolerance === tol
                              ? tol === 'CONSERVATIVE' ? 'bg-green-500 text-white'
                                : tol === 'AGGRESSIVE' ? 'bg-red-500 text-white'
                                : 'bg-[#3b82f6] text-white'
                              : 'bg-[#0f1729] text-[#a1a1aa] border border-[#2a2a4e]'
                          }`}
                        >
                          {tol === 'CONSERVATIVE' ? '🛡️ 保守' : tol === 'MODERATE' ? '⚖️ 适中' : '🔥 激进'}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs">
                      <span className={`px-2 py-0.5 rounded font-medium ${
                        tradingParams.params.riskTolerance === 'CONSERVATIVE' ? 'bg-green-500/20 text-green-400'
                          : tradingParams.params.riskTolerance === 'AGGRESSIVE' ? 'bg-red-500/20 text-red-400'
                          : 'bg-[#3b82f6]/20 text-[#3b82f6]'
                      }`}>
                        {tradingParams.params.riskTolerance === 'CONSERVATIVE' ? '🛡️ 保守' : tradingParams.params.riskTolerance === 'AGGRESSIVE' ? '🔥 激进' : '⚖️ 适中'}
                      </span>
                    </div>
                  )}
                </div>

                {/* 今日状态 */}
                <div className="config-section">
                  <div className="font-semibold mb-2">📊 今日状态</div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#a1a1aa]">日亏损</span>
                        <span className={tradingParams.liveStatus.todayLoss > 0 ? 'text-red-400' : 'text-[#a1a1aa]'}>
                          {tradingParams.liveStatus.todayLoss.toFixed(1)} / {tradingParams.params.dailyLossLimit} USDT
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#2a2a4e] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min((tradingParams.liveStatus.todayLoss / tradingParams.params.dailyLossLimit) * 100, 100)}%`,
                            backgroundColor: tradingParams.liveStatus.todayLoss / tradingParams.params.dailyLossLimit > 0.8 ? '#ef4444' : '#3b82f6',
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#a1a1aa]">账户亏损</span>
                        <span className={tradingParams.liveStatus.totalLoss > 0 ? 'text-red-400' : 'text-[#a1a1aa]'}>
                          {tradingParams.liveStatus.totalLoss.toFixed(1)} / {tradingParams.params.accountLossLimit} USDT
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#2a2a4e] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min((tradingParams.liveStatus.totalLoss / tradingParams.params.accountLossLimit) * 100, 100)}%`,
                            backgroundColor: tradingParams.liveStatus.totalLoss / tradingParams.params.accountLossLimit > 0.8 ? '#ef4444' : '#eab308',
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#a1a1aa]">今日交易</span>
                      <span className="text-[#e4e4e7]">{tradingParams.liveStatus.todayTradeCount} 次</span>
                    </div>
                  </div>
                </div>

                {/* 交易开关 */}
                <div className="config-section">
                  <div className="font-semibold mb-2">🔧 交易开关</div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${tradingParams.liveStatus.status === 'ACTIVE' ? 'bg-green-500' : tradingParams.liveStatus.status === 'PAUSED' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                      <span className="text-xs">
                        {tradingParams.liveStatus.status === 'ACTIVE' ? '运行中' : tradingParams.liveStatus.status === 'PAUSED' ? '已暂停' : tradingParams.liveStatus.status === 'FROZEN' ? '已冻结' : '已锁定'}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      tradingParams.liveStatus.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                      tradingParams.liveStatus.status === 'PAUSED' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {tradingParams.liveStatus.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {tradingParams.liveStatus.status === 'ACTIVE' ? (
                      <button
                        onClick={async () => {
                          if (!confirm('确定要暂停交易？')) return;
                          try {
                            const res = await fetch('/api/config/trading-params/pause', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: '用户主动暂停' }) });
                            if ((await res.json()).success) fetchTradingParams();
                          } catch {}
                        }}
                        className="flex-1 px-3 py-2 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded hover:bg-yellow-500/30 transition"
                      >
                        ⏸ 暂停交易
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/config/trading-params/resume', { method: 'POST' });
                            if ((await res.json()).success) fetchTradingParams();
                          } catch {}
                        }}
                        className="flex-1 px-3 py-2 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition"
                      >
                        ▶ 恢复交易
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (!confirm('确定要重置日亏损计数？')) return;
                        try {
                          const res = await fetch('/api/config/trading-params/reset-daily', { method: 'POST' });
                          if ((await res.json()).success) fetchTradingParams();
                        } catch {}
                      }}
                      className="px-3 py-2 text-xs bg-[#2a2a4e] text-[#a1a1aa] rounded hover:bg-[#1a1a2e] transition"
                    >
                      🔄 重置日亏损
                    </button>
                  </div>
                </div>

                {/* 保存按钮 (仅编辑模式) */}
                {tradingEditing && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={async () => {
                        setTradingSaving(true);
                        try {
                          const res = await fetch('/api/config/trading-params', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              availableCapital: tradingEditForm.availableCapital || null,
                              capitalPercentage: (tradingEditForm.dailyLossPercent as number) / 100 || 0.10,
                              tradeMode: tradingEditForm.tradeMode,
                              marginMode: tradingEditForm.marginMode || null,
                              positionMode: tradingEditForm.positionMode,
                              leverageMax: tradingEditForm.leverageMax,
                              dailyLossLimit: tradingEditForm.dailyLossLimit,
                              dailyLossPercent: (tradingEditForm.dailyLossPercent as number) / 100,
                              accountLossLimit: tradingEditForm.accountLossLimit,
                              accountLossPercent: (tradingEditForm.accountLossPercent as number) / 100,
                              riskTolerance: tradingEditForm.riskTolerance,
                            }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            setTradingEditing(false);
                            fetchTradingParams();
                            if (data.warnings?.length) alert('⚠️ ' + data.warnings.join('\n'));
                          } else {
                            alert(data.error || '保存失败');
                          }
                        } catch { alert('保存失败'); }
                        finally { setTradingSaving(false); }
                      }}
                      disabled={tradingSaving}
                      className="flex-1 px-3 py-2 text-xs bg-[#3b82f6] text-white rounded hover:bg-blue-600 transition disabled:opacity-50 font-medium"
                    >
                      {tradingSaving ? '⏳ 保存中...' : '💾 保存设置'}
                    </button>
                    <button
                      onClick={() => setTradingEditing(false)}
                      className="px-3 py-2 text-xs bg-[#2a2a4e] text-[#a1a1aa] rounded hover:bg-[#1a1a2e] transition"
                    >
                      取消
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="config-section text-center text-xs text-[#a1a1aa]">暂无交易配置</div>
            )}
          </div>
        );
      case 'strategy':
        return (
          <div className="relative">
            {/* Toast 容器 */}
            {toast && (
              <div className="toast-container" style={{ position: 'fixed', top: 12, right: 12, zIndex: 9999 }}>
                <div key={toast.id} className={`toast-item ${toast.type}`}>{toast.msg}</div>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <div className="panel-title" style={{ marginBottom: 0 }}>🎯 策略设置</div>
              <div className="flex gap-2">
                {(() => {
                  const draftCount = (strategies.custom as any[]).filter((s: any) => s.status === 'DRAFT').length;
                  return draftCount > 0 ? (
                    <button
                      onClick={() => setShowDrafts(!showDrafts)}
                      className={`px-3 py-1.5 text-xs rounded transition flex items-center gap-1 ${
                        showDrafts
                          ? 'bg-[#3b82f6] text-white border border-[#3b82f6]'
                          : 'bg-[#2a2a4e] text-[#e4e4e7] border border-[#f59e0b] hover:bg-[#1a1a2e]'
                      }`}
                    >
                      📝 查看草稿
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-[#f59e0b] text-black">
                        {draftCount}
                      </span>
                    </button>
                  ) : null;
                })()}
                <button
                  onClick={() => { fetchStrategies(); setWizardStep('input'); setParsedStrategy(null); setStrategyError(null); }}
                  className="px-3 py-1.5 text-xs bg-[#2a2a4e] text-[#e4e4e7] border border-[#3b82f6] rounded hover:bg-[#1a1a2e] transition"
                >
                  🔄 刷新
                </button>
              </div>
            </div>

            {strategiesLoading ? (
              <div className="config-section text-center text-xs text-[#a1a1aa]">⏳ 加载中...</div>
            ) : (
              <>
                {/* ===== 草稿箱展开面板 ===== */}
                {showDrafts && (() => {
                  const drafts = (strategies.custom as any[]).filter((s: any) => s.status === 'DRAFT');
                  return (
                    <div className="mb-4 border border-[#f59e0b]/30 rounded-lg overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(30,30,50,0.6) 100%)' }}>
                      <div className="flex items-center justify-between px-3 py-2 bg-[#f59e0b]/10 border-b border-[#f59e0b]/20">
                        <div className="text-xs font-semibold text-[#f59e0b] flex items-center gap-1.5">
                          📝 草稿箱
                          <span className="bg-[#f59e0b] text-black px-1.5 py-0.5 rounded-full text-[10px] font-bold">{drafts.length}</span>
                        </div>
                        <button
                          onClick={() => setShowDrafts(false)}
                          className="text-xs text-[#a1a1aa] hover:text-white transition"
                        >
                          ✕ 收起
                        </button>
                      </div>
                      {drafts.length === 0 ? (
                        <div className="px-3 py-4 text-center text-xs text-[#a1a1aa]">暂无草稿策略</div>
                      ) : (
                        <div className="p-2 space-y-2 max-h-[400px] overflow-y-auto">
                          {drafts.map((s: any) => (
                            <div key={s.id} className="rounded-lg p-3 bg-[#0f172a]/80 border border-[#2a2a4e]" style={{ borderLeft: '3px solid #f59e0b' }}>
                              {/* 策略名 + 状态标签 */}
                              <div className="flex justify-between items-center mb-2">
                                <div className="font-semibold text-sm text-[#e4e4e7] flex items-center gap-1.5">
                                  📝 {s.name}
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30">
                                    草稿
                                  </span>
                                </div>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={async () => {
                                      try {
                                        const res = await fetch(`/api/config/strategies/${s.id}/apply`, { method: 'POST' });
                                        const data = await res.json();
                                        if (data.success) {
                                          showToast('success', `策略"${s.name}"已应用`);
                                          fetchStrategies();
                                        } else {
                                          showToast('error', data.error || '应用失败');
                                        }
                                      } catch { showToast('error', '网络错误'); }
                                    }}
                                    className="px-2.5 py-1 text-xs bg-[#3b82f6] text-white rounded hover:bg-blue-600 transition flex items-center gap-1"
                                  >
                                    🚀 应用
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!confirm('确定删除此草稿？')) return;
                                      try {
                                        await fetch(`/api/config/strategies?id=${s.id}`, { method: 'DELETE' });
                                        showToast('success', '草稿已删除');
                                        fetchStrategies();
                                      } catch { showToast('error', '删除失败'); }
                                    }}
                                    className="px-2 py-1 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                              {/* 策略参数详情 */}
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                <div className="text-[#a1a1aa]">
                                  方向: <span className={s.direction === 'BUY' ? 'text-[#22c55e]' : s.direction === 'SHORT' ? 'text-[#ef4444]' : 'text-[#eab308]'}>
                                    {s.direction === 'BUY' ? '📈 做多' : s.direction === 'SHORT' ? '📉 做空' : '👀 观望'}
                                  </span>
                                </div>
                                <div className="text-[#a1a1aa]">
                                  杠杆: <span className="text-[#e4e4e7] font-medium">{s.leverage}x</span>
                                </div>
                                <div className="text-[#a1a1aa]">
                                  仓位: <span className="text-[#e4e4e7] font-medium">{s.positionSize}x</span>
                                </div>
                                <div className="text-[#a1a1aa]">
                                  类型: <span className="text-[#e4e4e7] font-medium">{s.tradeType || 'N/A'}</span>
                                </div>
                                {s.stopLoss && (
                                  <div className="text-[#a1a1aa]">
                                    止损: <span className="text-[#ef4444] font-medium">{s.stopLoss}</span>
                                  </div>
                                )}
                                {s.takeProfit && (
                                  <div className="text-[#a1a1aa]">
                                    止盈: <span className="text-[#22c55e] font-medium">{s.takeProfit}</span>
                                  </div>
                                )}
                              </div>
                              {/* 原始输入 */}
                              {s.rawInput && (
                                <div className="mt-2 p-2 rounded bg-[#0a0f1e] border border-[#1e293b]">
                                  <div className="text-[10px] text-[#71717a] mb-0.5">💬 原始输入</div>
                                  <div className="text-xs text-[#94a3b8] break-all">{s.rawInput}</div>
                                </div>
                              )}
                              {/* 时间信息 */}
                              <div className="flex justify-between items-center mt-2 text-[10px] text-[#71717a]">
                                <span>创建: {new Date(s.createdAt).toLocaleString('zh-CN')}</span>
                                {s.updatedAt && s.updatedAt !== s.createdAt && (
                                  <span>更新: {new Date(s.updatedAt).toLocaleString('zh-CN')}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ===== 推荐策略 (保持原有逻辑，修复应用按钮) ===== */}
                <div className="text-xs text-[#a1a1aa] mb-2">📋 推荐策略 ({(strategies.recommended as unknown[]).length})</div>
                {(strategies.recommended as any[]).length === 0 ? (
                  <div className="config-section text-center text-xs text-[#a1a1aa]">
                    暂无推荐策略，等待A4验证推送
                  </div>
                ) : (
                  (strategies.recommended as any[]).map((s: any) => (
                    <div key={s.id} className="config-section" style={{ borderLeft: `3px solid ${s.direction === 'BUY' ? '#22c55e' : s.direction === 'SHORT' ? '#ef4444' : '#eab308'}` }}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-semibold">{s.direction === 'SKIP' ? '🟡' : s.direction === 'BUY' ? '🟢' : '🔴'} {s.name}</div>
                        <div>
                          {!s.isRead && <span className="bg-green-500 text-black px-1.5 py-0.5 rounded text-xs mr-1">新</span>}
                          <span className="text-xs text-[#a1a1aa]">{s.regime || ''}</span>
                        </div>
                      </div>
                      <div className="text-xs text-[#a1a1aa]">
                        {s.regime && `${s.regime} | `}置信度{s.confidence || '?'}% | Edge {s.edgeScore || '?'}
                      </div>
                      <div className="text-xs mt-1">方向: {s.direction === 'BUY' ? '做多' : s.direction === 'SHORT' ? '做空' : '观望'} | 杠杆: {s.leverage}x | 仓位: {s.positionSize}x</div>
                      {s.source && <div className="text-xs text-[#06b6d4] mt-1">来源: {s.source}</div>}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/config/strategies/${s.id}/apply`, { method: 'POST' });
                              const data = await res.json();
                              if (data.success) {
                                showToast('success', `策略"${s.name}"已应用`);
                                fetchStrategies();
                              } else {
                                showToast('error', data.error || '应用失败');
                              }
                            } catch { showToast('error', '网络错误'); }
                          }}
                          className="px-2.5 py-1 text-xs bg-[#3b82f6] text-white rounded hover:bg-blue-600 transition"
                        >
                          应用
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {/* ===== 已有自定义策略列表 ===== */}
                {(strategies.custom as any[]).length > 0 && (
                  <>
                    <div className="text-xs text-[#a1a1aa] mt-4 mb-2">📝 已有自定义策略 ({(strategies.custom as any[]).length})</div>
                    {(strategies.custom as any[]).map((s: any) => (
                      <div key={s.id} className="config-section" style={{ borderLeft: `3px solid ${s.status === 'APPLIED' ? '#22c55e' : s.status === 'PAUSED' ? '#eab308' : '#6b7280'}` }}>
                        <div className="flex justify-between items-center mb-1">
                          <div className="font-semibold text-xs">
                            {s.status === 'APPLIED' ? '🟢' : s.status === 'PAUSED' ? '⏸️' : '📝'} {s.name}
                          </div>
                          <div className="flex gap-1.5">
                            {s.status === 'DRAFT' && (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/config/strategies/${s.id}/apply`, { method: 'POST' });
                                    const data = await res.json();
                                    if (data.success) {
                                      showToast('success', `策略"${s.name}"已应用`);
                                      fetchStrategies();
                                    } else {
                                      showToast('error', data.error || '应用失败');
                                    }
                                  } catch { showToast('error', '网络错误'); }
                                }}
                                className="px-2 py-0.5 text-xs bg-[#3b82f6] text-white rounded hover:bg-blue-600 transition"
                              >
                                应用
                              </button>
                            )}
                            {s.status === 'APPLIED' && (
                              <button
                                onClick={async () => {
                                  try {
                                    await fetch(`/api/config/strategies/${s.id}/pause`, { method: 'POST' });
                                    showToast('success', '策略已暂停');
                                    fetchStrategies();
                                  } catch {}
                                }}
                                className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded hover:bg-yellow-500/30 transition"
                              >
                                ⏸ 暂停
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                if (!confirm('确定删除此策略？')) return;
                                try {
                                  await fetch(`/api/config/strategies?id=${s.id}`, { method: 'DELETE' });
                                  showToast('success', '策略已删除');
                                  fetchStrategies();
                                } catch {}
                              }}
                              className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-[#a1a1aa]">
                          方向: {s.direction === 'BUY' ? '做多' : s.direction === 'SHORT' ? '做空' : '观望'} | 杠杆: {s.leverage}x | 仓位: {s.positionSize}x
                        </div>
                        {s.stopLoss && <div className="text-xs text-[#ef4444]">止损: {s.stopLoss}</div>}
                        {s.takeProfit && <div className="text-xs text-[#22c55e]">止盈: {s.takeProfit}</div>}
                        {s.rawInput && <div className="text-xs text-[#71717a] mt-1 truncate">原始输入: {s.rawInput}</div>}
                        <div className="text-xs text-[#71717a] mt-1">状态: {s.status} | 创建: {new Date(s.createdAt).toLocaleString('zh-CN')}</div>
                      </div>
                    ))}
                  </>
                )}

                {/* ===== 自定义策略 — 三步向导 ===== */}
                <div className="text-xs text-[#a1a1aa] mt-4 mb-2">✏️ 自定义策略</div>
                <div className="config-section">

                  {/* 步骤指示器 */}
                  <div className="wizard-steps">
                    {(() => {
                      const step = wizardStep as string;
                      return (
                        <>
                          <div className={`wizard-step-dot ${step === 'input' ? 'active' : step !== 'input' ? 'done' : ''}`}>
                            <div className="step-num">{step !== 'input' ? '✓' : '1'}</div>
                            <div className="step-label">输入</div>
                          </div>
                          <div className={`wizard-step-connector ${step !== 'input' ? 'done' : ''}`} />
                          <div className={`wizard-step-dot ${step === 'preview' ? 'active' : step === 'confirm' ? 'done' : ''}`}>
                            <div className="step-num">{step === 'confirm' ? '✓' : '2'}</div>
                            <div className="step-label">预览</div>
                          </div>
                          <div className={`wizard-step-connector ${step === 'confirm' ? 'done' : ''}`} />
                          <div className={`wizard-step-dot ${step === 'confirm' ? 'active' : ''}`}>
                            <div className="step-num">3</div>
                            <div className="step-label">确认</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* ── Step 1: 意图输入 ── */}
                  {wizardStep === 'input' && (
                    <>
                      <div className="text-xs text-[#a1a1aa] mb-3">描述你的策略意图，系统将自动解析并生成可调参数</div>

                      <textarea
                        value={customStrategyInput}
                        onChange={(e) => setCustomStrategyInput(e.target.value)}
                        placeholder="例如：RSI低于30并且MACD金叉的时候做多BTC，2x杠杆..."
                        className="w-full bg-[#0f1729] border border-[#2a2a4e] rounded-md p-2.5 text-[#e4e4e7] text-sm min-h-[64px] resize-y focus:outline-none focus:border-[#3b82f6] transition"
                      />

                      {/* 模板卡片 */}
                      <div className="text-xs text-[#71717a] mt-3 mb-1.5">快捷模板（点击填充）</div>
                      <div className="template-grid">
                        {[
                          { id: 'trend', icon: '📊', label: '趋势跟随', desc: '均线多头排列时顺势入场', input: '当MA20上穿MA60且成交量放大时，以2x杠杆做多BTC永续合约', dir: 'BUY', lever: 2, type: 'SWAP' },
                          { id: 'rsi', icon: '📈', label: '超卖反弹', desc: 'RSI极端区域逆向抄底', input: '当RSI(14)低于30且出现背离时，做多BTC现货', dir: 'BUY', lever: 1, type: 'SPOT' },
                          { id: 'boll', icon: '📉', label: '均值回归', desc: '布林带触及下轨后回归中线', input: '价格触及布林带下轨且MACD柱缩短时，做多BTC现货', dir: 'BUY', lever: 1, type: 'SPOT' },
                          { id: 'breakout', icon: '⚡', label: '放量突破', desc: '突破关键阻力位追入', input: '价格放量突破前高且站稳上方时，3x杠杆做多BTC永续合约', dir: 'BUY', lever: 3, type: 'SWAP' },
                        ].map(t => (
                          <div
                            key={t.id}
                            className="template-card"
                            onClick={() => {
                              setCustomStrategyInput(t.input);
                              setWizardForm(prev => ({ ...prev, direction: t.dir, leverage: t.lever, tradeType: t.type }));
                            }}
                          >
                            <div><span className="template-card-icon">{t.icon}</span><span className="template-card-title">{t.label}</span></div>
                            <div className="template-card-desc">{t.desc}</div>
                          </div>
                        ))}
                      </div>

                      {strategyError && (
                        <div className="inline-error">{strategyError}</div>
                      )}

                      <button
                        onClick={async () => {
                          if (!customStrategyInput.trim()) { setStrategyError('请输入策略描述'); return; }
                          setStrategyError(null);
                          setWizardParsing(true);
                          try {
                            const res = await fetch('/api/config/strategies/parse', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ rawInput: customStrategyInput }),
                            });
                            const data = await res.json();
                            if (data.success) {
                              setParsedStrategy(data.data);
                              // 预填充表单为解析结果
                              const p = data.data.suggestedParams;
                              setWizardForm({
                                direction: p.direction,
                                symbol: p.symbol,
                                tradeType: p.tradeType,
                                leverage: p.leverage,
                                positionSize: p.positionSize,
                                stopLoss: p.stopLoss?.toString() || '',
                                takeProfit: p.takeProfit?.toString() || '',
                                frequency: 'FOUR_H',
                              });
                              setWizardStep('preview');
                            } else {
                              setStrategyError(data.error || '解析失败');
                            }
                          } catch { setStrategyError('网络错误，请重试'); }
                          finally { setWizardParsing(false); }
                        }}
                        disabled={wizardParsing || !customStrategyInput.trim()}
                        className="w-full mt-3 px-4 py-2.5 text-sm bg-[#3b82f6] text-white rounded-md hover:bg-blue-600 transition disabled:opacity-50 font-medium"
                      >
                        {wizardParsing ? (
                          <span>⏳ 正在解析...</span>
                        ) : (
                          <span>🔍 解析策略 →</span>
                        )}
                      </button>
                    </>
                  )}

                  {/* ── Step 2: 解析预览 + 参数调整 ── */}
                  {wizardStep === 'preview' && parsedStrategy && (
                    <>
                      {/* 系统理解卡片 */}
                      <div className="parse-preview-card">
                        <div className="parse-preview-header">
                          <span className="parse-preview-icon">🤖</span>
                          <span className="parse-preview-title">系统理解</span>
                        </div>
                        <div className="parse-preview-text">{parsedStrategy.explanation}</div>
                        {parsedStrategy.intent.indicators.length > 0 && (
                          <div className="indicator-tags">
                            {parsedStrategy.intent.indicators.map((ind: string) => (
                              <span key={ind} className="indicator-tag">{ind}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 置信度 */}
                      <div className="confidence-bar-container">
                        <span className="text-xs text-[#a1a1aa]">置信度</span>
                        <div className="confidence-bar-track">
                          <div className="confidence-bar-fill" style={{ width: `${parsedStrategy.confidence}%` }} />
                        </div>
                        <span className="confidence-bar-text">{parsedStrategy.confidence}%</span>
                      </div>

                      {/* 参数调整表单 */}
                      <div className="param-form">
                        {/* 方向 */}
                        <div className="param-field">
                          <div className="param-label">交易方向</div>
                          <div className="param-radio-group">
                            {['BUY', 'SHORT', 'SKIP'].map(d => (
                              <div
                                key={d}
                                className={`param-radio-btn ${wizardForm.direction === d ? (d === 'BUY' ? 'active-buy' : d === 'SHORT' ? 'param-radio-btn-active-short' : 'param-radio-btn-active-skip') : ''}`}
                                onClick={() => setWizardForm(f => ({ ...f, direction: d }))}
                              >
                                {d === 'BUY' ? '🟢 做多' : d === 'SHORT' ? '🔴 做空' : '🟡 观望'}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 品种 */}
                        <div className="param-field">
                          <div className="param-label">交易品种</div>
                          <select
                            value={wizardForm.symbol}
                            onChange={(e) => setWizardForm(f => ({ ...f, symbol: e.target.value }))}
                            className="param-select"
                          >
                            <option value="BTC-USDT-SWAP">BTC-USDT-SWAP</option>
                            <option value="ETH-USDT-SWAP">ETH-USDT-SWAP</option>
                            <option value="SOL-USDT-SWAP">SOL-USDT-SWAP</option>
                          </select>
                        </div>

                        {/* 类型 Toggle */}
                        <div className="param-field">
                          <div className="param-label">交易类型</div>
                          <div className="param-toggle-group">
                            <div
                              className={`param-toggle-btn ${wizardForm.tradeType === 'SPOT' ? 'active' : ''}`}
                              onClick={() => setWizardForm(f => ({ ...f, tradeType: 'SPOT', leverage: 1 }))}
                            >💰 现货</div>
                            <div
                              className={`param-toggle-btn ${wizardForm.tradeType === 'SWAP' ? 'active' : ''}`}
                              onClick={() => setWizardForm(f => ({ ...f, tradeType: 'SWAP', leverage: f.leverage <= 1 ? 2 : f.leverage }))}
                            >⚡ 合约</div>
                          </div>
                        </div>

                        {/* 杠杆 Slider */}
                        {wizardForm.tradeType === 'SWAP' && (
                          <div className="param-field">
                            <div className="param-label">
                              <span>杠杆倍数</span>
                              <span className="param-label-value">{wizardForm.leverage}x</span>
                            </div>
                            <div className="param-slider-row">
                              <input
                                type="range" min="1" max="5" step="1"
                                value={wizardForm.leverage}
                                onChange={(e) => setWizardForm(f => ({ ...f, leverage: parseInt(e.target.value) }))}
                                className="param-slider-input flex-1"
                              />
                            </div>
                          </div>
                        )}

                        {/* 仓位 Slider */}
                        <div className="param-field">
                          <div className="param-label">
                            <span>仓位比例</span>
                            <span className="param-label-value">{(wizardForm.positionSize * 100).toFixed(0)}%</span>
                          </div>
                          <div className="param-slider-row">
                            <input
                              type="range" min="10" max="100" step="10"
                              value={Math.round(wizardForm.positionSize * 100)}
                              onChange={(e) => setWizardForm(f => ({ ...f, positionSize: parseInt(e.target.value) / 100 }))}
                              className="param-slider-input flex-1"
                            />
                          </div>
                        </div>

                        {/* 止损/止盈 并排 */}
                        <div className="flex gap-2">
                          <div className="param-field flex-1">
                            <div className="param-label"><span>止损价</span></div>
                            <input
                              type="number" placeholder="可选"
                              value={wizardForm.stopLoss}
                              onChange={(e) => setWizardForm(f => ({ ...f, stopLoss: e.target.value }))}
                              className="param-number-input"
                            />
                          </div>
                          <div className="param-field flex-1">
                            <div className="param-label"><span>止盈价</span></div>
                            <input
                              type="number" placeholder="可选"
                              value={wizardForm.takeProfit}
                              onChange={(e) => setWizardForm(f => ({ ...f, takeProfit: e.target.value }))}
                              className="param-number-input"
                            />
                          </div>
                        </div>

                        {/* 执行频率 */}
                        <div className="param-field">
                          <div className="param-label">执行频率</div>
                          <div className="param-radio-group">
                            {[
                              { v: 'ONE_H', l: '1小时' },
                              { v: 'FOUR_H', l: '4小时' },
                              { v: 'ONE_D', l: '1天' },
                            ].map(freq => (
                              <div
                                key={freq.v}
                                className={`param-radio-btn ${wizardForm.frequency === freq.v ? 'active-buy' : ''}`}
                                onClick={() => setWizardForm(f => ({ ...f, frequency: freq.v }))}
                              >
                                {freq.l}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 警告 */}
                      {parsedStrategy.warnings.length > 0 && (
                        <div className="warnings-list">
                          {parsedStrategy.warnings.map((w: string, i: number) => (
                            <div key={i} className="warning-item">
                              <span className="warning-icon">⚠️</span>
                              <span>{w}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 操作按钮 */}
                      <div className="wizard-actions">
                        <button
                          className="wizard-btn wizard-btn-secondary"
                          onClick={() => setWizardStep('input')}
                        >
                          ← 返回修改
                        </button>
                        <button
                          className="wizard-btn wizard-btn-primary"
                          onClick={() => setWizardStep('confirm')}
                        >
                          ✅ 确认创建 →
                        </button>
                      </div>
                    </>
                  )}

                  {/* ── Step 3: 确认 + 应用 ── */}
                  {wizardStep === 'confirm' && (
                    <>
                      <div className="confirm-success-card">
                        <div className="confirm-success-icon">📋</div>
                        <div className="confirm-success-title">确认策略参数</div>
                        <div className="confirm-success-detail">
                          <div>{wizardForm.direction === 'BUY' ? '🟢' : wizardForm.direction === 'SHORT' ? '🔴' : '🟡'}{' '}
                            {customStrategyInput.slice(0, 40)}{customStrategyInput.length > 40 ? '...' : ''}</div>
                          <div style={{ marginTop: 4 }}>
                            {wizardForm.symbol} · {wizardForm.tradeType === 'SWAP' ? `${wizardForm.leverage}x合约` : '现货'}
                            {' '}· 仓位{(wizardForm.positionSize * 100).toFixed(0)}%
                            {wizardForm.stopLoss ? ` · SL=${wizardForm.stopLoss}` : ''}
                            {wizardForm.takeProfit ? ` · TP=${wizardForm.takeProfit}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="wizard-actions">
                        <button
                          className="wizard-btn wizard-btn-secondary"
                          onClick={() => setWizardStep('preview')}
                        >
                          ← 返回调整
                        </button>
                        <button
                          className="wizard-btn wizard-btn-success"
                          onClick={async () => {
                            setCustomStrategyLoading(true);
                            try {
                              const res = await fetch('/api/config/strategies', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  type: 'CUSTOM',
                                  name: customStrategyInput.slice(0, 40),
                                  description: parsedStrategy?.explanation || '',
                                  direction: wizardForm.direction,
                                  symbol: wizardForm.symbol,
                                  tradeType: wizardForm.tradeType,
                                  leverage: wizardForm.leverage,
                                  positionSize: wizardForm.positionSize,
                                  stopLoss: wizardForm.stopLoss ? parseFloat(wizardForm.stopLoss) : null,
                                  takeProfit: wizardForm.takeProfit ? parseFloat(wizardForm.takeProfit) : null,
                                  confidence: parsedStrategy?.confidence || null,
                                  rawInput: customStrategyInput,
                                }),
                              });
                              const data = await res.json();
                              if (data.success) {
                                // 尝试自动 apply
                                try {
                                  await fetch(`/api/config/strategies/${data.data.id}/apply`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ frequency: wizardForm.frequency }),
                                  });
                                } catch {} // apply 失败不阻断

                                showToast('success', `策略"${data.data.name}"创建成功`);
                                setCustomStrategyInput('');
                                setParsedStrategy(null);
                                setWizardStep('input');
                                fetchStrategies();
                              } else {
                                showToast('error', data.error || '创建失败');
                              }
                            } catch { showToast('error', '创建失败'); }
                            finally { setCustomStrategyLoading(false); }
                          }}
                          disabled={customStrategyLoading}
                        >
                          {customStrategyLoading ? '⏳ 创建中...' : '🚀 创建并应用策略'}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* ===== 已应用策略 (保持原有逻辑) ===== */}
                {(strategies.applied as any[]).length > 0 && (
                  <>
                    <div className="text-xs text-[#a1a1aa] mt-4 mb-2">📊 已应用策略 ({(strategies.applied as any[]).length})</div>
                    {(strategies.applied as any[]).map((s: any) => (
                      <div key={s.id} className="config-section" style={{ borderLeft: '3px solid #22c55e' }}>
                        <div className="flex justify-between items-center mb-1">
                          <div className="font-semibold text-xs">🟢 {s.name}</div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={async () => {
                                try {
                                  await fetch(`/api/config/strategies/${s.id}/pause`, { method: 'POST' });
                                  showToast('success', '策略已暂停');
                                  fetchStrategies();
                                } catch {}
                              }}
                              className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded hover:bg-yellow-500/30 transition"
                            >
                              ⏸ 暂停
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm('确定删除此策略？')) return;
                                try {
                                  await fetch(`/api/config/strategies?id=${s.id}`, { method: 'DELETE' });
                                  showToast('success', '策略已删除');
                                  fetchStrategies();
                                } catch {}
                              }}
                              className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-[#a1a1aa]">
                          {s.leverage}x | {s.direction === 'BUY' ? '做多' : s.direction === 'SHORT' ? '做空' : '观望'}
                          {s.tasks?.[0] && ` | ${s.tasks[0].executionFrequency}`}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        );
      case 'communication':
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="panel-title" style={{ marginBottom: 0 }}>📡 通信渠道</div>
              <button
                onClick={() => setShowAddChannelForm(!showAddChannelForm)}
                className="px-3 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition font-medium"
              >
                ➕ 添加
              </button>
            </div>

            {/* 添加渠道表单 */}
            {showAddChannelForm && (
              <div className="config-section" style={{ borderLeft: '3px solid #22c55e' }}>
                <div className="font-semibold mb-3 text-sm">添加新渠道</div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-[#a1a1aa]">渠道类型</label>
                    <select
                      value={addChannelForm.channelType}
                      onChange={(e) => setAddChannelForm({ ...addChannelForm, channelType: e.target.value })}
                      className="w-full mt-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                    >
                      <option value="TELEGRAM">📱 Telegram</option>
                      <option value="WECHAT_SERVERCHAN">💬 微信 (Server酱)</option>
                      <option value="EMAIL_SMTP">📧 Email</option>
                      <option value="DISCORD">🎮 Discord</option>
                      <option value="SLACK">📲 Slack</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#a1a1aa]">标签</label>
                    <input
                      value={addChannelForm.label}
                      onChange={(e) => setAddChannelForm({ ...addChannelForm, label: e.target.value })}
                      className="w-full mt-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                      placeholder="我的信号群"
                    />
                  </div>

                  {/* Telegram 配置 */}
                  {addChannelForm.channelType === 'TELEGRAM' && (
                    <>
                      <div>
                        <label className="text-xs text-[#a1a1aa]">Bot Token</label>
                        <input
                          type="password"
                          value={addChannelForm.botToken}
                          onChange={(e) => setAddChannelForm({ ...addChannelForm, botToken: e.target.value })}
                          className="w-full mt-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                          placeholder="123456:ABC-DEF..."
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#a1a1aa]">Chat ID</label>
                        <input
                          value={addChannelForm.chatId}
                          onChange={(e) => setAddChannelForm({ ...addChannelForm, chatId: e.target.value })}
                          className="w-full mt-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                          placeholder="-1001234567890"
                        />
                      </div>
                    </>
                  )}

                  {/* Server酱 配置 */}
                  {addChannelForm.channelType === 'WECHAT_SERVERCHAN' && (
                    <div>
                      <label className="text-xs text-[#a1a1aa]">SendKey</label>
                      <input
                        type="password"
                        value={addChannelForm.sendKey}
                        onChange={(e) => setAddChannelForm({ ...addChannelForm, sendKey: e.target.value })}
                        className="w-full mt-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                        placeholder="SCTxxxx..."
                      />
                    </div>
                  )}

                  {/* 推送类型 */}
                  <div>
                    <label className="text-xs text-[#a1a1aa]">推送类型</label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {[
                        { key: 'trade_signal', label: '交易信号' },
                        { key: 'risk_alert', label: '风险告警' },
                        { key: 'intel_update', label: '情报更新' },
                        { key: 'daily_report', label: '每日报告' },
                        { key: 'strategy_update', label: '策略推荐' },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => {
                            const types = addChannelForm.enabledTypes.includes(key)
                              ? addChannelForm.enabledTypes.filter((t: string) => t !== key)
                              : [...addChannelForm.enabledTypes, key];
                            setAddChannelForm({ ...addChannelForm, enabledTypes: types });
                          }}
                          className={`px-2 py-0.5 text-xs rounded transition ${
                            addChannelForm.enabledTypes.includes(key)
                              ? 'bg-[#3b82f6] text-white'
                              : 'bg-[#0f1729] text-[#a1a1aa] border border-[#2a2a4e]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 静默时段 */}
                  <div>
                    <label className="text-xs text-[#a1a1aa]">静默时段 (可选)</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        value={addChannelForm.silentStart}
                        onChange={(e) => setAddChannelForm({ ...addChannelForm, silentStart: e.target.value })}
                        className="flex-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                        placeholder="23:00"
                      />
                      <span className="text-xs text-[#a1a1aa] self-center">-</span>
                      <input
                        value={addChannelForm.silentEnd}
                        onChange={(e) => setAddChannelForm({ ...addChannelForm, silentEnd: e.target.value })}
                        className="flex-1 bg-[#0f1729] border border-[#2a2a4e] rounded-md px-2.5 py-1.5 text-xs text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                        placeholder="07:00"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={async () => {
                        const credentials: Record<string, string> = {};
                        if (addChannelForm.channelType === 'TELEGRAM') {
                          credentials.botToken = addChannelForm.botToken;
                          credentials.chatId = addChannelForm.chatId;
                        } else if (addChannelForm.channelType === 'WECHAT_SERVERCHAN') {
                          credentials.sendKey = addChannelForm.sendKey;
                        }
                        try {
                          const res = await fetch('/api/config/channels', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              channelType: addChannelForm.channelType,
                              label: addChannelForm.label,
                              credentials,
                              pushRules: { enabledTypes: addChannelForm.enabledTypes },
                              silentStart: addChannelForm.silentStart || null,
                              silentEnd: addChannelForm.silentEnd || null,
                              format: addChannelForm.format,
                            }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            setShowAddChannelForm(false);
                            setAddChannelForm({
                              channelType: 'TELEGRAM', label: '', botToken: '', chatId: '', sendKey: '',
                              enabledTypes: ['trade_signal', 'risk_alert', 'intel_update'],
                              format: 'CONCISE', silentStart: '', silentEnd: '',
                            });
                            fetchChannels();
                          } else { alert(data.error || '添加失败'); }
                        } catch { alert('添加失败'); }
                      }}
                      className="flex-1 px-3 py-2 text-xs bg-[#3b82f6] text-white rounded hover:bg-blue-600 transition font-medium"
                    >
                      💾 保存
                    </button>
                    <button
                      onClick={() => setShowAddChannelForm(false)}
                      className="px-3 py-2 text-xs bg-[#2a2a4e] text-[#a1a1aa] rounded hover:bg-[#1a1a2e] transition"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 渠道列表 */}
            {channelsLoading ? (
              <div className="config-section text-center text-xs text-[#a1a1aa]">⏳ 加载中...</div>
            ) : (channels as any[]).length === 0 ? (
              <div className="config-section text-center text-xs text-[#a1a1aa]">
                暂无通信渠道配置<br />
                <span className="text-xs">点击上方"➕ 添加"按钮配置</span>
              </div>
            ) : (
              (channels as any[]).map((ch: any) => (
                <div key={ch.id} className="config-section">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-semibold">
                      {ch.channelType === 'TELEGRAM' ? '📱' : ch.channelType === 'WECHAT_SERVERCHAN' ? '💬' : '📧'} {ch.label || ch.channelType}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ch.isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {ch.isOnline ? '● 在线' : '○ 离线'}
                    </span>
                  </div>
                  {ch.pushRules?.enabledTypes && (
                    <div className="text-xs text-[#a1a1aa] mb-1">
                      推送: {ch.pushRules.enabledTypes.map((t: string) => {
                        const labels: Record<string, string> = { trade_signal: '交易信号', risk_alert: '风险告警', intel_update: '情报更新', daily_report: '每日报告', strategy_update: '策略推荐' };
                        return labels[t] || t;
                      }).join('/')}
                    </div>
                  )}
                  {(ch.silentStart && ch.silentEnd) && (
                    <div className="text-xs text-[#a1a1aa]">静默: {ch.silentStart} - {ch.silentEnd}</div>
                  )}
                  {/* 测试结果 */}
                  {channelTestResult && channelTestResult[ch.id] && (
                    <div className={`text-xs mb-2 p-2 rounded ${channelTestResult[ch.id].success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {channelTestResult[ch.id].success ? '✅' : '❌'} {channelTestResult[ch.id].message}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={async () => {
                        setChannelTesting(ch.id);
                        setChannelTestResult(null);
                        try {
                          const res = await fetch(`/api/config/channels/${ch.id}/test`, { method: 'POST' });
                          const data = await res.json();
                          if (data.success) {
                            setChannelTestResult({ [ch.id]: data.data });
                            if (data.data?.success) fetchChannels();
                          }
                        } catch {} finally { setChannelTesting(null); }
                      }}
                      disabled={channelTesting === ch.id}
                      className="px-2.5 py-1 text-xs bg-[#3b82f6] text-white rounded hover:bg-blue-600 transition disabled:opacity-50"
                    >
                      {channelTesting === ch.id ? '⏳ 测试中...' : '测试'}
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm('确定删除此渠道？')) return;
                        try {
                          await fetch(`/api/config/channels?id=${ch.id}`, { method: 'DELETE' });
                          fetchChannels();
                        } catch {}
                      }}
                      className="px-2.5 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case 'monitor':
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="panel-title" style={{ marginBottom: 0 }}>📡 信息传递监控</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMonitorPaused(!monitorPaused)}
                  className="text-[10px] px-2 py-1 rounded transition"
                  style={{ background: monitorPaused ? '#3b82f6' : '#0f3460', color: monitorPaused ? '#fff' : '#a1a1aa' }}
                >
                  {monitorPaused ? '▶ 恢复' : '⏸ 暂停'}
                </button>
                <button
                  onClick={() => setMonitorEvents([])}
                  className="text-[10px] px-2 py-1 rounded bg-[#0f3460] text-[#a1a1aa] hover:text-[#e4e4e7] transition"
                >
                  🗑 清除
                </button>
              </div>
            </div>

            {/* ===== 全链路状态概览 ===== */}
            <div className="config-section mb-3">
              <div className="text-[10px] text-[#a1a1aa] mb-2 font-semibold">全链路状态</div>
              <div className="flex items-center gap-1 text-[10px]">
                {monitorPipeline ? (
                  <>
                    {(['frontend', 'gateway', 'workbuddy', 'artifact_hub'] as const).map((layer, idx) => {
                      const info = monitorPipeline[layer];
                      const labels: Record<string, string> = {
                        frontend: '前端', gateway: '中台', workbuddy: 'WB', artifact_hub: '产物',
                      };
                      const icons: Record<string, string> = {
                        frontend: '🖥️', gateway: '🔀', workbuddy: '⚙️', artifact_hub: '📦',
                      };
                      const isHealthy = info.rate !== '--' && parseInt(info.rate) >= 90;
                      const isWarning = info.rate !== '--' && parseInt(info.rate) >= 70 && parseInt(info.rate) < 90;
                      return (
                        <div key={layer} className="flex items-center gap-0.5">
                          {idx > 0 && <span className="text-[#a1a1aa]">→</span>}
                          <div className={`px-1.5 py-1 rounded text-center min-w-[52px] ${
                            isHealthy ? 'bg-green-500/15 border border-green-500/20' :
                            isWarning ? 'bg-yellow-500/15 border border-yellow-500/20' :
                            'bg-[#0f3460] border border-[#1a1a2e]'
                          }`}>
                            <div className="text-[9px]">{icons[layer]} {labels[layer]}</div>
                            <div className={`font-bold ${
                              isHealthy ? 'text-green-400' : isWarning ? 'text-yellow-400' : 'text-[#a1a1aa]'
                            }`}>
                              {info.rate === '--' ? '--' : info.rate}
                            </div>
                            <div className="text-[8px] text-[#a1a1aa]">{info.completed}/{info.total}</div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <span className="text-[#a1a1aa]">等待数据...</span>
                )}
              </div>
            </div>

            {/* ===== 实时事件流 ===== */}
            <div className="config-section mb-3" style={{ maxHeight: '240px', overflowY: 'auto' }}>
              <div className="text-[10px] text-[#a1a1aa] mb-2 font-semibold">
                实时事件流 {monitorPaused && <span className="text-yellow-400">（已暂停）</span>}
              </div>
              {monitorEvents.length === 0 ? (
                <div className="text-[10px] text-[#a1a1aa] text-center py-3">
                  暂无事件 — 提交请求后自动显示
                </div>
              ) : (
                <div className="space-y-1">
                  {monitorEvents.slice(0, 20).map((event) => {
                    const time = new Date(event.timestamp).toLocaleTimeString('zh-CN', { hour12: false });
                    const statusIcon: Record<string, string> = {
                      received: '📥', processing: '🔄', completed: '✅', failed: '❌', timeout: '⏱️',
                    };
                    const layerColors: Record<string, string> = {
                      frontend: '#3b82f6', gateway: '#8b5cf6', workbuddy: '#f59e0b', artifact_hub: '#22c55e',
                    };
                    const phaseLabels: Record<string, string> = {
                      user_input: '用户请求', intent_recognized: '意图识别', task_created: '任务创建',
                      inline_exec_start: '内联执行→', inline_exec_done: '内联完成✓',
                      async_spawned: '异步触发', trade_pending: '交易待确认',
                      wb_received: 'WB接收', wb_completed: 'WB完成', wb_failed: 'WB失败',
                      artifact_synced: '产物同步', feed_ready: 'Feed就绪', result_displayed: '结果展示',
                      chain_started: '链路启动', index_updated: '索引更新', wb_processing: 'WB处理中',
                    };
                    const isSelected = monitorSelectedTrace === event.trace_id;
                    return (
                      <div
                        key={event.id}
                        onClick={() => setMonitorSelectedTrace(isSelected ? null : event.trace_id)}
                        className={`flex items-center gap-1.5 py-1 px-1.5 rounded cursor-pointer transition text-[10px] ${
                          event.status === 'failed' || event.status === 'timeout'
                            ? 'bg-red-500/10 border border-red-500/20'
                            : isSelected
                            ? 'bg-[#3b82f6]/15 border border-[#3b82f6]/30'
                            : 'hover:bg-[#0f3460]/40'
                        }`}
                      >
                        <span className="text-[9px] text-[#a1a1aa] flex-shrink-0">{time}</span>
                        <span>{statusIcon[event.status] || '❓'}</span>
                        <span
                          className="px-1 rounded text-[8px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: layerColors[event.layer] || '#666' }}
                        >
                          {event.layer.slice(0, 3).toUpperCase()}
                        </span>
                        <span className="text-[#e4e4e7] flex-1 truncate">
                          {phaseLabels[event.phase] || event.phase}
                        </span>
                        {event.duration_ms != null && (
                          <span className="text-[8px] text-[#a1a1aa] flex-shrink-0">{event.duration_ms}ms</span>
                        )}
                        {event.intent && (
                          <span className="text-[8px] text-[#3b82f6] flex-shrink-0 truncate max-w-[50px]">{event.intent}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ===== 链路追踪详情 ===== */}
            {monitorSelectedTrace && (
              <div className="config-section mb-3 border border-[#3b82f6]/20 rounded-lg p-2">
                <div className="text-[10px] text-[#3b82f6] font-semibold mb-2">
                  🔗 链路追踪: {monitorSelectedTrace.slice(0, 30)}...
                </div>
                {(() => {
                  const traceEvents = monitorEvents
                    .filter(e => e.trace_id === monitorSelectedTrace)
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                  return (
                    <div className="space-y-1">
                      {traceEvents.map((event, idx) => {
                        const time = new Date(event.timestamp).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        const statusColors: Record<string, string> = {
                          received: '#3b82f6', processing: '#f59e0b', completed: '#22c55e', failed: '#ef4444', timeout: '#f59e0b',
                        };
                        return (
                          <div key={event.id} className="flex items-center gap-1.5 text-[9px]">
                            <span className="text-[#a1a1aa] w-16 flex-shrink-0">{time}</span>
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusColors[event.status] || '#666' }} />
                            <span className="text-[#e4e4e7]">{event.phase}</span>
                            {event.intent && <span className="text-[#3b82f6]">[{event.intent}]</span>}
                            {event.duration_ms != null && <span className="text-[#a1a1aa]">{event.duration_ms}ms</span>}
                            {event.error && <span className="text-red-400 truncate max-w-[80px]">{event.error}</span>}
                          </div>
                        );
                      })}
                      {traceEvents.length === 0 && (
                        <span className="text-[#a1a1aa] text-[9px]">暂无此 trace 的事件</span>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ===== 统计面板 ===== */}
            <div className="config-section">
              <div className="text-[10px] text-[#a1a1aa] mb-2 font-semibold">统计</div>
              {monitorStats ? (
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-[#0f3460] rounded p-1.5 text-center">
                    <div className="text-[#a1a1aa] text-[8px]">今日请求</div>
                    <div className="font-bold text-[#e4e4e7]">{monitorStats.total_requests}</div>
                  </div>
                  <div className="bg-[#0f3460] rounded p-1.5 text-center">
                    <div className="text-[#a1a1aa] text-[8px]">成功率</div>
                    <div className={`font-bold ${monitorStats.success_rate >= 90 ? 'text-green-400' : monitorStats.success_rate >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {monitorStats.success_rate}%
                    </div>
                  </div>
                  <div className="bg-[#0f3460] rounded p-1.5 text-center">
                    <div className="text-[#a1a1aa] text-[8px]">均耗时</div>
                    <div className="font-bold text-[#e4e4e7]">{monitorStats.avg_duration_ms}ms</div>
                  </div>
                  <div className="bg-[#0f3460] rounded p-1.5 text-center">
                    <div className="text-[#a1a1aa] text-[8px]">活跃Trace</div>
                    <div className="font-bold text-[#3b82f6]">{monitorStats.active_traces}</div>
                  </div>
                </div>
              ) : (
                <span className="text-[10px] text-[#a1a1aa]">等待数据...</span>
              )}
              {/* 意图分布 */}
              {monitorStats?.intent_distribution && Object.keys(monitorStats.intent_distribution).length > 0 && (
                <div className="mt-2">
                  <div className="text-[8px] text-[#a1a1aa] mb-1">意图分布</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(monitorStats.intent_distribution).map(([intent, count]) => {
                      const intentColors: Record<string, string> = {
                        market_query: '#3b82f6', deep_analysis: '#8b5cf6', scenario_sim: '#f59e0b',
                        strategy_verify: '#06b6d4', execute_trade: '#22c55e', simple_qa: '#a1a1aa',
                      };
                      const intentLabels: Record<string, string> = {
                        market_query: '行情', deep_analysis: '分析', scenario_sim: '推演',
                        strategy_verify: '验证', execute_trade: '交易', simple_qa: '问答',
                      };
                      return (
                        <span key={intent} className="text-[8px] px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: intentColors[intent] || '#666' }}>
                          {intentLabels[intent] || intent}: {count}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* 异常统计 */}
              {monitorStats && (monitorStats.total_failed > 0 || monitorStats.total_timeout > 0) && (
                <div className="mt-2 flex items-center gap-2 text-[9px]">
                  <span className="text-red-400">❌ 失败: {monitorStats.total_failed}</span>
                  <span className="text-yellow-400">⏱️ 超时: {monitorStats.total_timeout}</span>
                </div>
              )}
            </div>
          </div>
        );

      case 'report':
        return (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => { setSelectedReport(null); setRightPanelContent('analysis'); }}
                className="text-[#a1a1aa] hover:text-[#e4e4e7] transition"
              >
                ←
              </button>
              <div className="panel-title" style={{ marginBottom: 0 }}>📄 研报详情</div>
            </div>
            {reportContentLoading ? (
              <div className="config-section text-center">
                <span className="text-[#a1a1aa]">⏳ 加载中...</span>
              </div>
            ) : selectedReport ? (
              <div className="report-content">
                {/* 元数据标签 */}
                {selectedReport.metadata && (
                  <div className="config-section mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                        style={{ backgroundColor: selectedReport.metadata.phaseColor || '#3b82f6' }}
                      >
                        {selectedReport.metadata.chain_phase}
                      </span>
                      <span className="text-xs text-[#a1a1aa]">{selectedReport.metadata.title}</span>
                    </div>
                    <div className="text-xs text-[#a1a1aa]">
                      {selectedReport.metadata.regime && <span>Regime: {selectedReport.metadata.regime} | </span>}
                      {selectedReport.metadata.confidence !== undefined && <span>置信度: {selectedReport.metadata.confidence}% | </span>}
                      {selectedReport.metadata.direction && <span>方向: {selectedReport.metadata.direction}</span>}
                    </div>
                  </div>
                )}
                {/* Markdown内容 */}
                <div className="report-markdown">
                  <ReactMarkdown>{selectedReport.content}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="config-section text-center text-[#a1a1aa] text-xs">
                未选择研报
              </div>
            )}
          </div>
        );
      default:
        return (
          <div>
            <div className="panel-title">📌 分析面板</div>
            
            {/* ===== 动态分析链路进度 ===== */}
            {analysisChain.length > 0 ? (
              <div>
                <div className="panel-subtitle">
                  📊 分析进度 
                  {analysisStartTime && (
                    <span className="text-[10px] text-[#a1a1aa] ml-2">
                      {(() => {
                        const endTime = analysisEndTime || Date.now();
                        const elapsed = Math.floor((endTime - analysisStartTime) / 1000);
                        return elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed/60)}m${elapsed%60}s`;
                      })()}
                    </span>
                  )}
                  {analysisConfidence !== null && (
                    <span className={`ml-2 text-[10px] px-1 py-0.5 rounded ${
                      analysisConfidence >= 60 ? 'bg-green-500/20 text-green-400' :
                      analysisConfidence >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {analysisConfidence}% 置信度
                    </span>
                  )}
                </div>
                
                {/* 总体进度条 */}
                <div className="config-section mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-[#a1a1aa]">
                      {analysisChain.filter(s => s.status === 'completed').length}/{analysisChain.length} 步骤完成
                    </span>
                    <span className="text-[10px] text-[#a1a1aa]">
                      {analysisChain.some(s => s.status === 'running') ? '执行中...' : 
                       analysisChain.every(s => s.status === 'completed') ? '✅ 全部完成' :
                       analysisChain.some(s => s.status === 'error') ? '❌ 执行异常' : '等待中'}
                    </span>
                  </div>
                  <div className="w-full bg-[#0f3460] rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ 
                        width: `${(analysisChain.filter(s => s.status === 'completed').length / analysisChain.length) * 100}%`,
                        background: analysisChain.some(s => s.status === 'error') 
                          ? 'linear-gradient(90deg, #22c55e, #ef4444)' 
                          : 'linear-gradient(90deg, #3b82f6, #22c55e)',
                      }}
                    />
                  </div>
                </div>

                {/* 链路步骤列表 */}
                <div className="config-section space-y-1">
                  {analysisChain.map((step, idx) => (
                    <div 
                      key={step.id}
                      className={`flex items-center gap-2 py-1.5 px-2 rounded transition-all duration-300 ${
                        step.status === 'running' ? 'bg-[#0f3460]/60 border border-[#3b82f6]/30' : 
                        step.status === 'error' ? 'bg-red-500/10 border border-red-500/20' :
                        step.status === 'completed' ? '' : 'opacity-50'
                      }`}
                    >
                      {/* 步骤序号 + 状态图标 */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                        step.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        step.status === 'running' ? 'bg-[#3b82f6]/20 text-[#3b82f6]' :
                        step.status === 'error' ? 'bg-red-500/20 text-red-400' :
                        'bg-[#0f3460] text-[#a1a1aa]'
                      }`}>
                        {step.status === 'completed' ? '✓' : 
                         step.status === 'running' ? (idx + 1) :
                         step.status === 'error' ? '✗' :
                         (idx + 1)}
                      </div>
                      
                      {/* 步骤图标+名称 */}
                      <span className={`text-xs flex-1 ${
                        step.status === 'completed' ? 'text-green-400' :
                        step.status === 'running' ? 'text-[#e4e4e7]' :
                        step.status === 'error' ? 'text-red-400' :
                        'text-[#a1a1aa]'
                      }`}>
                        {step.icon} {step.label}
                      </span>

                      {/* 状态标签 */}
                      {step.status === 'completed' && (
                        <span className="text-[10px] text-green-400">✅ 完成</span>
                      )}
                      {step.status === 'running' && (
                        <span className="text-[10px] text-[#3b82f6] animate-pulse">🔄 执行中</span>
                      )}
                      {step.status === 'error' && (
                        <span className="text-[10px] text-red-400">❌ 失败</span>
                      )}
                      {step.status === 'idle' && (
                        <span className="text-[10px] text-[#a1a1aa]">⏳ 等待</span>
                      )}

                      {/* 完成时间 */}
                      {step.timestamp && (
                        <span className="text-[9px] text-[#71717a]">{step.timestamp}</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* 连接线 — 步骤间的视觉连接 */}
                <div className="flex items-center justify-center gap-1 mt-2 mb-1">
                  {analysisChain.map((step, idx) => (
                    <div key={step.id} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        step.status === 'completed' ? 'bg-green-500' :
                        step.status === 'running' ? 'bg-[#3b82f6] animate-pulse' :
                        step.status === 'error' ? 'bg-red-500' :
                        'bg-[#0f3460]'
                      }`} />
                      {idx < analysisChain.length - 1 && (
                        <div className={`w-4 h-0.5 ${
                          step.status === 'completed' ? 'bg-green-500/50' : 'bg-[#0f3460]'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* 空闲状态 — 显示提示 */
              <div className="config-section text-center py-6">
                <div className="text-2xl mb-2">🧠</div>
                <div className="text-xs text-[#a1a1aa] mb-1">暂无进行中的分析</div>
                <div className="text-[10px] text-[#71717a]">发送消息后，分析进度将在此实时显示</div>
                <div className="text-[10px] text-[#71717a] mt-1">
                  ⚡快速: A1→A2 | 🧠深度: A1→A2→A3→A4
                </div>
              </div>
            )}

            <div className="panel-subtitle">📋 市场概况</div>
            <div className="config-section">
              <div className="config-row"><span>品种</span><span>BTC-USDT-SWAP</span></div>
              <div className="config-row"><span>状态</span><span className="text-yellow-500">区间震荡</span></div>
              <div className="config-row"><span>持仓</span><span>空仓</span></div>
              <div className="config-row"><span>恐惧指数</span><span>42 (恐惧)</span></div>
              <div className="config-row"><span>资金费率</span><span>+0.003%</span></div>
            </div>
            <div className="panel-subtitle">📄 最新研报 ({reportList.length})</div>
            {/* 非当日产物警告 */}
            {reportList.length > 0 && !reportList.some(r => r.isToday) && (
              <div className="config-section" style={{ borderLeft: '3px solid #eab308', padding: '8px 12px' }}>
                <div className="text-xs text-yellow-500">⚠️ 当前无当日产物，展示最近可用研报</div>
              </div>
            )}
            {reportLoading ? (
              <div className="config-section text-xs text-[#a1a1aa]">⏳ 加载中...</div>
            ) : reportList.length === 0 ? (
              <div className="config-section text-xs text-[#a1a1aa]">暂无研报</div>
            ) : (
              <div className="space-y-2">
                {reportList.map((report, idx) => (
                  <div
                    key={idx}
                    className="report-card"
                    onClick={() => fetchReportContent(report.file)}
                    style={{ borderLeftColor: report.phaseColor || '#3b82f6' }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                        style={{ backgroundColor: report.phaseColor || '#3b82f6' }}
                      >
                        {report.chain_phase}
                      </span>
                      <span className="text-xs text-[#e4e4e7] truncate flex-1">{report.title}</span>
                      {/* 新鲜度标签 */}
                      {report.isToday ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-500/20 text-green-400">🟢 当日</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/20 text-yellow-400">🟡 非当日</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[#a1a1aa]">
                      <span>{report.relativeTime || (report.date ? new Date(report.date).toLocaleDateString('zh-CN') : '')}</span>
                      {report.confidence !== undefined && report.confidence !== null && (
                        <span className={`px-1 py-0.5 rounded ${
                          report.confidence >= 60 ? 'bg-green-500/20 text-green-400' :
                          report.confidence >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {report.confidence}%
                        </span>
                      )}
                      {report.direction && (
                        <span className={`${
                          report.direction === 'LONG' || report.direction === 'BUY' ? 'text-red-500' :
                          report.direction === 'SHORT' || report.direction === 'BEARISH' ? 'text-green-500' :
                          'text-[#a1a1aa]'
                        }`}>
                          {report.direction}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {/* 查看全部按钮 */}
                <button
                  onClick={async () => {
                    setReportLoading(true);
                    try {
                      const res = await fetch('/api/reports?phases=A1,A2,A3,A6&limit=20');
                      const data = await res.json();
                      if (data.success) {
                        setReportList(data.data);
                      }
                    } catch {} finally {
                      setReportLoading(false);
                    }
                  }}
                  className="w-full text-center text-xs text-[#3b82f6] hover:text-[#60a5fa] transition py-2"
                >
                  📋 查看全部研报 →
                </button>
              </div>
            )}
          </div>
        );
    }
  };

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1a1a2e]">
        <div className="text-[#a1a1aa]">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#1a1a2e] text-[#e4e4e7]">
      {/* Left Sidebar */}
      <div
        className={`${leftCollapsed ? "w-0" : "w-64"} flex-shrink-0 flex flex-col bg-[#16213e] border-r border-[#0f3460] transition-all duration-300 overflow-hidden`}
      >
        <div className="p-4 border-b border-[#0f3460] flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#e4e4e7]">🧠 Dream</h1>
          {renderStatusDot(llmStatus)}
        </div>
        
        <div className="p-3">
          <button
            onClick={() => setLeftCollapsed(true)}
            className="w-full text-left px-3 py-2 text-sm text-[#a1a1aa] hover:bg-[#0f3460] rounded-md transition"
          >
            ← 收起
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="text-xs text-[#a1a1aa] px-3 py-1">今天</div>
          <div className="px-3 py-2 text-sm bg-[#0f3460] rounded-md text-[#3b82f6] cursor-pointer">
            🔴 BTC 行情分析
          </div>
          <div className="px-3 py-2 text-sm hover:bg-[#0f3460] rounded-md text-[#e4e4e7] cursor-pointer">
            📈 ETH 走势查看
          </div>
        </div>
        
        {/* Collapsible Modules */}
        <div className="p-3 space-y-2 border-t border-[#0f3460]">
          <div className="collapsible-module">
            <div 
              className="collapsible-header"
              onClick={() => setDataCardExpanded(!dataCardExpanded)}
            >
              <span className="flex items-center gap-2">📊 数据卡片</span>
              <span className={`arrow ${dataCardExpanded ? 'expanded' : ''}`}>▶</span>
            </div>
            <div className={`collapsible-content ${dataCardExpanded ? 'expanded' : ''}`}>
              <div className="collapsible-item" onClick={() => handleShowRightPanel('market')}>📈 行情卡片</div>
              <div className="collapsible-item" onClick={() => handleShowRightPanel('signal')}>📊 评分卡片</div>
              <div className="collapsible-item" onClick={() => handleShowRightPanel('position')}>💼 持仓卡片</div>
            </div>
          </div>
          
          <div className="collapsible-module">
            <div 
              className="collapsible-header"
              onClick={() => setSettingsExpanded(!settingsExpanded)}
            >
              <span className="flex items-center gap-2">⚙️ 设置</span>
              <span className={`arrow ${settingsExpanded ? 'expanded' : ''}`}>▶</span>
            </div>
            <div className={`collapsible-content ${settingsExpanded ? 'expanded' : ''}`}>
              <div className="collapsible-item" onClick={() => handleShowRightPanel('llm')}>🤖 大模型配置</div>
              <div className="collapsible-item" onClick={() => handleShowRightPanel('api')}>⚙️ API配置</div>
              <div className="collapsible-item" onClick={() => handleShowRightPanel('trading')}>💰 交易设置</div>
              <div className="collapsible-item" onClick={() => handleShowRightPanel('strategy')}>🎯 策略设置</div>
              <div className="collapsible-item" onClick={() => handleShowRightPanel('communication')}>📡 通信渠道</div>
              <div className="collapsible-item" onClick={() => handleShowRightPanel('monitor')}>📡 传递监控</div>
            </div>
          </div>
        </div>
        
        {/* User Info */}
        <div className="p-3 border-t border-[#0f3460] bg-[#0f1729]">
          {mounted && session ? (
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-[#3b82f6] rounded-full flex items-center justify-center text-sm">
                {(session.user?.name?.[0] || 'U').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{session.user?.name || '用户'}</div>
                <div className="text-xs text-[#a1a1aa]">{session.user?.email || ''}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-[#3b82f6] rounded-full flex items-center justify-center text-sm">U</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">测试用户</div>
                <div className="text-xs text-[#a1a1aa]">U3kR***xQ</div>
              </div>
            </div>
          )}
          <div className="text-xs text-yellow-500 font-semibold mb-2">💎 1,250 积分</div>
          <div className="flex gap-2">
            <button className="flex-1 px-2.5 py-1.5 text-xs bg-[#3b82f6] text-white rounded hover:bg-blue-600 transition">签到</button>
            <button className="flex-1 px-2.5 py-1.5 text-xs bg-[#2a2a4e] text-[#e4e4e7] border border-[#3b82f6] rounded hover:bg-[#1a1a2e] transition">明细</button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-[600px] bg-[#0f3460]">
        {/* Header */}
        <div className="h-14 border-b border-[#0f3460] flex items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            {leftCollapsed && (
              <button onClick={() => setLeftCollapsed(false)} className="p-1 hover:bg-[#16213e] rounded transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <span className="text-sm font-medium">BTC 行情分析</span>
          </div>
          
          {/* 思考模式切换 */}
          <div className="flex items-center space-x-1 bg-[#16213e] rounded-lg p-0.5">
            <button
              onClick={() => setThinkingMode('quick')}
              className={`px-3 py-1.5 text-xs rounded-md transition ${
                thinkingMode === 'quick'
                  ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20'
                  : 'text-[#a1a1aa] hover:text-[#e4e4e7]'
              }`}
              title="快速思考：轻量级，直接调用SKILL"
            >
              ⚡ 快速思考
            </button>
            <button
              onClick={() => setThinkingMode('deep')}
              className={`px-3 py-1.5 text-xs rounded-md transition ${
                thinkingMode === 'deep'
                  ? 'bg-[#8b5cf6] text-white shadow-lg shadow-purple-500/20'
                  : 'text-[#a1a1aa] hover:text-[#e4e4e7]'
              }`}
              title="深度思考：完整A1-A5闭环"
            >
              🧠 深度思考
            </button>
          </div>
          
          {/* WorkBuddy桥接模式切换 */}
          <div className="flex items-center space-x-1 bg-[#16213e] rounded-lg p-0.5">
            <button
              onClick={() => setWorkbuddyMode(true)}
              className={`px-3 py-1.5 text-xs rounded-md transition ${
                workbuddyMode
                  ? 'bg-[#22c55e] text-white shadow-lg shadow-green-500/20'
                  : 'text-[#a1a1aa] hover:text-[#e4e4e7]'
              }`}
              title="WorkBuddy桥接：中台即时执行，对话任务秒级响应，交易任务需确认"
            >
              🔗 桥接
            </button>
            <button
              onClick={() => setWorkbuddyMode(false)}
              className={`px-3 py-1.5 text-xs rounded-md transition ${
                !workbuddyMode
                  ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20'
                  : 'text-[#a1a1aa] hover:text-[#e4e4e7]'
              }`}
              title="直接模式：使用LLM/Mock即时响应"
            >
              💬 直接
            </button>
          </div>
          
          <button
            onClick={() => setRightCollapsed(!rightCollapsed)}
            className="p-1 hover:bg-[#16213e] rounded text-[#a1a1aa] transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-4 py-3 rounded-lg ${
                  msg.role === "user"
                    ? "bg-[#3b82f6] text-white"
                    : "bg-[#16213e] text-[#e4e4e7]"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="text-[#06b6d4] text-xs mb-1.5 flex items-center gap-2 flex-wrap">
                    <span>🤖 AI助手 · {i === 0 ? "2秒前" : "刚刚"}</span>
                    {msg.intent && msg.intent !== "unknown" && msg.intent !== "thinking" && msg.intent !== "error" && (
                      <span className="bg-[#0f3460] px-1.5 py-0.5 rounded text-[10px]">
                        {msg.intent}
                      </span>
                    )}
                    {msg.confidence !== undefined && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        msg.confidence >= 0.8 ? 'bg-green-500/20 text-green-400' : 
                        msg.confidence >= 0.6 ? 'bg-yellow-500/20 text-yellow-400' : 
                        'bg-red-500/20 text-red-400'
                      }`}>
                        置信度 {(msg.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                    {msg.context_aware && (
                      <span className="bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded text-[10px]">
                        💡 上下文
                      </span>
                    )}
                    {msg.thinking_mode && msg.thinking_mode !== 'quick' && (
                      <span className="bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded text-[10px]">
                        🧠 深度
                      </span>
                    )}
                  </div>
                )}
                {msg.role === "user" && (
                  <div className="text-right text-xs mb-1.5 opacity-70">👤 你</div>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {/* 交易确认按钮 */}
                {msg.trade_task_id && !msg.trade_confirmed && (
                  <div className="mt-3 pt-3 border-t border-[#0f3460]">
                    <div className="text-xs text-[#a1a1aa] mb-2">🔒 请确认交易操作：</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleTradeConfirm(msg.trade_task_id!, 'confirm')}
                        className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-md hover:bg-green-600 transition font-medium"
                      >
                        ✅ 确认执行
                      </button>
                      <div className="flex items-center gap-1">
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="px-2 py-1 text-xs bg-[#0f1729] border border-[#2a2a4e] rounded text-[#e4e4e7] focus:outline-none focus:border-[#3b82f6]"
                          style={{ width: '90px' }}
                        />
                        <button
                          onClick={() => handleTradeConfirm(msg.trade_task_id!, 'schedule')}
                          className="px-3 py-1.5 text-xs bg-yellow-500 text-black rounded-md hover:bg-yellow-600 transition font-medium"
                        >
                          🕐 定时执行
                        </button>
                      </div>
                      <button
                        onClick={() => handleTradeConfirm(msg.trade_task_id!, 'cancel')}
                        className="px-3 py-1.5 text-xs bg-red-500/80 text-white rounded-md hover:bg-red-600 transition font-medium"
                      >
                        🚫 取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Quick Commands */}
        <div className="px-4 py-2 border-t border-[#0f3460]">
          <div className="flex flex-wrap gap-2 mb-2">
            {["/行情", "/分析", "/推演", "/验证", "/开仓"].map((cmd) => (
              <button
                key={cmd}
                onClick={() => setInput(cmd)}
                className="px-3 py-1 text-xs bg-[#16213e] text-[#a1a1aa] rounded-full hover:bg-[#0f3460] transition"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
        
        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-[#0f3460]">
          <div className="flex items-center space-x-2 bg-[#16213e] rounded-lg px-4 py-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`输入消息... (${
                workbuddyMode ? '🔗桥接' : '💬直接'
              } | ${
                thinkingMode === 'quick' ? '⚡快速' : '🧠深度'
              } | 支持 /命令)`}
              className="flex-1 bg-transparent text-sm text-[#e4e4e7] placeholder-[#a1a1aa] focus:outline-none"
            />
            <button type="submit" className="p-2 bg-[#3b82f6] rounded-md hover:bg-blue-600 transition">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-[#a1a1aa]">
            <span className="flex items-center gap-2">
              模型: {llmModel}
              {renderStatusDot(llmStatus)}
              | 方法: {intentMethod === 'llm' ? '🧠 LLM' : '📋 规则'}
              |               {workbuddyMode ? (
                <span className="text-green-500 font-semibold">🔗 中台即时</span>
              ) : (
                <span className="text-blue-400">💬 直接模式</span>
              )}
            </span>
            <span>
              模式: {thinkingMode === 'quick' ? '⚡ 快速思考' : '🧠 深度思考'}
            </span>
          </div>
        </form>
      </div>

      {/* Right Panel */}
      <div
        className={`${rightCollapsed ? "w-0" : "w-80"} flex-shrink-0 flex flex-col bg-[#16213e] border-l border-[#0f3460] transition-all duration-300 overflow-hidden`}
      >
        <div className="p-4 border-b border-[#0f3460] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#3b82f6]">
            {rightPanelContent === 'analysis' ? '📌 分析面板' : 
             rightPanelContent === 'market' ? '📈 行情卡片' :
             rightPanelContent === 'signal' ? '🎯 评分卡片' :
             rightPanelContent === 'position' ? '💼 持仓卡片' :
             rightPanelContent === 'api' ? '⚙️ API配置' :
             rightPanelContent === 'trading' ? '💰 交易设置' :
             rightPanelContent === 'strategy' ? '🎯 策略设置' :
             rightPanelContent === 'communication' ? '📡 通信渠道' :
             rightPanelContent === 'llm' ? '🤖 大模型配置' :
             rightPanelContent === 'monitor' ? '📡 传递监控' :
             rightPanelContent === 'report' ? '📄 研报详情' : '面板'}
          </h2>
          <button
            onClick={() => {
              if (rightPanelContent !== 'analysis') {
                setRightPanelContent('analysis');
              } else {
                setRightCollapsed(true);
              }
            }}
            className="p-1 hover:bg-[#0f3460] rounded transition text-[#a1a1aa]"
            title={rightPanelContent !== 'analysis' ? '返回分析面板' : '关闭面板'}
          >
            {rightPanelContent !== 'analysis' ? '←' : '✕'}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {renderRightPanel()}
        </div>
      </div>
      
    </div>
  );
}
