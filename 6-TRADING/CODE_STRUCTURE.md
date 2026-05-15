# 6-TRADING 代码结构索引 v1.0

> **创建日期**: 2026-05-15
> **数据来源**: 44304工作区（内部系统）
> **用途**: 6-TRADING对外服务系统

---

## 📁 目录结构

```
6-TRADING/
├── scripts/              # A系列Python脚本
├── skills/               # SKILL模块
├── config/               # 配置文件（6-TRADING专用）
├── config_44304/         # 44304原始配置（参照）
├── automation/            # 自动化脚本
├── data/                 # 数据目录
│   ├── episodes/         # 交易决策记录
│   └── reports/           # 分析报告样本
├── docs/                 # 架构文档
├── dream-universal-gateway/  # 前端项目
└── .workbuddy/           # 记忆系统
```

---

## 📜 一、Scripts 目录（A系列脚本）

| 文件 | 功能 | 对应A系 |
|------|------|---------|
| `a1_research.py` | A1调研分析 | A1 |
| `a2_first_principles_v2.6_auto.py` | A2第一性原理 | A2 |
| `a4_validation_executor.py` | A4战术验证 | A4 |
| `a5_guards.py` | A5门禁检查 | A5 |
| `dream_trade_exec.py` | 交易执行 | A5 |
| `dream_strategy_pipeline.py` | 策略流水线 | A3 |
| `master_strategy_retriever.py` | 大师策略检索 | A3 |
| `dream_stop_loss_monitor.py` | 止损监控 | A9 |
| `okx_cli.py` | OKX CLI封装 | 执行层 |
| `okx_unified_toolkit.py` | OKX统一工具包 | 执行层 |

### 脚本使用说明

```bash
# 运行A2第一性原理分析
python scripts/a2_first_principles_v2.6_auto.py

# 运行A4战术验证
python scripts/a4_validation_executor.py

# 运行交易执行
python scripts/dream_trade_exec.py

# 运行OKX工具包
python scripts/okx_unified_toolkit.py
```

---

## 🧩 二、Skills 目录（SKILL模块）

| SKILL | 功能 | 对应A系 |
|-------|------|---------|
| `dream-exit-skill-v2/` | A9离场决策 | A9 |
| `dream-pretrade-gatekeeper/` | 预交易门禁 | A5 |
| `dream-strategy-designer/` | 策略设计 | A3 |
| `A7-practice-theory/` | 理论与实践 | A7 |
| `A8-theory-practice-verification/` | 自我批评验证 | A8 |
| `dream-bailian-integration/` | 百炼集成 | 工具 |
| `dream-knowledge/` | 知识库 | 工具 |
| `dream-data-analysis/` | 数据分析 | 工具 |
| `master-seminar/` | 大师研讨 | A3 |

---

## ⚙️ 三、Config 目录（配置文件）

| 文件 | 说明 |
|------|------|
| `strategy_library.yaml` | 策略库（v2.2） |
| `config_44304/` | 44304原始配置参照目录 |

---

## 🔄 四、Automation 目录（自动化）

| 文件 | 说明 |
|------|------|
| `a2_automation_prompt_v2.6.1.md` | A2每日自动化脚本 |

---

## 📊 五、Data 目录（数据）

### Episodes（交易决策记录）

| 文件 | 说明 |
|------|------|
| `A5_HOLD_*.json` | 持仓决策 |
| `a4_episode_*.json` | A4验证决策 |
| `EP*.json` | 完整决策记录 |

### Reports（分析报告样本）

| 文件 | 说明 |
|------|------|
| `ARCHITECTURE_VERIFICATION_REPORT_*.md` | 架构验证报告 |
| `SKILL_ACTIVATION_PLAN_*.md` | SKILL激活计划 |
| `THREE_MAILBOX_SYSTEM_*.md` | 三邮箱系统文档 |

---

## 🔗 六、同步脚本

```bash
# 从44304同步最新代码
./scripts/sync_from_44304.sh

# 或者手动同步
rsync -av /Users/zhangjiangtao/WorkBuddy/20260415144304/scripts/ scripts/
rsync -av /Users/zhangjiangtao/WorkBuddy/20260415144304/1-TRADE/ skills/
```

---

## 🚀 七、下一步

1. **桥接层开发**: 创建API封装调用scripts/
2. **前端集成**: 与dream-universal-gateway对接
3. **用户系统**: 基于意图识别路由到不同SKILL
4. **测试验证**: 模拟盘验证后服务用户

---

> **状态**: ✅ 代码已从44304同步
> **维护**: 通过sync_from_44304.sh保持同步
