# 产物中台 (Artifact Hub) 设计文档

> **版本**: v1.1
> **更新日期**: 2026-05-14 19:50

---

## 🏛️ 系统定位

产物中台是 Dream-MultiSkill 系统的统一产物管理与投递中心，负责：
- **产物存储**: 所有工作流产物统一存储管理
- **产物索引**: 自动维护产物索引，支持快速检索
- **产物投递**: 双通道投递（秘书邮箱 + 前端中心）
- **产物展示**: 与 Dream Universal Gateway 集成展示

---

## 📐 架构设计

### 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Dream-MultiSkill 系统                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    工作流层 (A0-A9)                   │   │
│  │  A1调研 │ A2分析 │ A3推演 │ A4验证 │ A5执行 │ ...   │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                               │
│                            ▼                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              产物对齐管理器 (AAM SKILL)               │   │
│  │  sync_artifact.py │ index.json │ frontmatter规范    │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                               │
│                            ▼                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                     产物中台层                        │   │
│  │  ~/.workbuddy/artifacts/                            │   │
│  │  ├── trading/     │ memory/  │ governance/         │   │
│  │  ├── knowledge/   │ evolution/  │ hr/             │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                               │
│                            ▼                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Dream Universal Gateway                 │   │
│  │                   localhost:3456                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 目录结构

### 产物存储目录 (`~/.workbuddy/artifacts/`)

```
~/.workbuddy/artifacts/
├── _frontend_cache/          # 前端缓存索引
│   ├── exit_index.json
│   ├── macro_index.json
│   └── masters_index.json
│
├── trading/                  # 交易决策产物 (A0-A9)
│   ├── index.json           # 产物索引
│   ├── a1_*.md              # A1调研报告
│   ├── a2_*.json             # A2分析结果
│   ├── a3_*.md               # A3推演报告
│   └── ...
│
├── memory/                   # 记忆工作流产物
│   ├── MEMORY.md
│   └── episodes/
│
├── governance/               # 治理工作流产物
│   └── ...
│
├── knowledge/                # 知识库产物
│   └── ...
│
├── evolution/                # 系统进化产物
│   └── ...
│
├── a_series/                 # A系列汇总
│   └── ...
│
├── secretary/                # 秘书产物
│   └── reports/
│
└── hr/                      # HR工作流产物
    └── ...
```

### 产物索引文件结构

```json
// trading/index.json
{
  "last_updated": "2026-05-14T14:30:00+08:00",
  "count": 156,
  "items": [
    {
      "id": "a1_research_20260514",
      "title": "A1 深度调研 2026-05-14",
      "date": "2026-05-14T01:06:00+08:00",
      "type": "research",
      "chain_phase": "A1",
      "tags": ["BTC", "market-analysis", "regime-detection"],
      "path": "a1_research_20260514.md"
    }
  ]
}
```

---

## 🔧 核心组件

### 1. 产物对齐管理器 (AAM SKILL)

**位置**: `~/.workbuddy/skills/artifact-alignment-manager/`

**功能**:
- 投递执行: 调用 `sync_artifact.py` 自动同步产物
- 投递验证: 检查 frontmatter 完整性、index.json 状态
- 时间戳规范化: 统一收口，所有时间戳格式
- 双通道保证: 秘书邮箱 + 前端产物中心

**时间戳规范**:
| 格式 | 示例 | 用途 |
|------|------|------|
| 标准格式 | `2026-05-06T17:54:15+08:00` | frontmatter `date` 字段 |
| 纯日期格式 | `2026-05-06` | 仅日期无时间 |
| 紧凑格式 | `20260506_175415` | 文件名时间戳 |

### 2. 同步脚本 (sync_artifact.py)

**位置**: `~/.workbuddy/scripts/sync_artifact.py`

**功能**:
- 自动扫描产物目录
- 更新 index.json 索引
- 验证产物格式

**使用方式**:
```bash
# 同步产物
python3 ~/.workbuddy/scripts/sync_artifact.py --sync

# 验证时间戳
python3 ~/.workbuddy/scripts/sync_artifact.py --check-ts "2026-05-06"

# 重建索引
python3 ~/.workbuddy/scripts/sync_artifact.py --rebuild
```

### 3. 产物中心维护 (dream-product-hub-maintenance SKILL)

**位置**: `~/.workbuddy/skills/dream-product-hub-maintenance/`

**功能**:
- 前端内容扫描与修复
- 文件格式规范化
- 分类映射管理

---

## 📋 产物命名规范

### 文件命名格式

```
{a_chain_phase}_{category}_{YYYYMMDD}_{HHMM}.{extension}
```

### 示例

```
a1_research_20260514_0130.md
a2_first_principles_20260514_0130.json
a3_strategy_20260514_1300.md
a4_validation_20260514_1200.md
```

### Frontmatter 规范

```yaml
---
title: "A1 深度调研 2026-05-14"
date: "2026-05-14T01:06:00+08:00"
summary: "BTC市场深度调研报告"
chain_phase: "A1"
tags: ["BTC", "market-analysis", "regime-detection"]
author: "Dream-MultiSkill"
version: "1.0"
---
```

---

## 🚀 团队协作指南

### 开发环境设置

1. **克隆仓库后初始化产物目录**:
```bash
# 创建产物存储目录
mkdir -p ~/.workbuddy/artifacts/{trading,memory,governance,knowledge,evolution}

# 初始化索引文件
echo '{"last_updated":"","count":0,"items":[]}' > ~/.workbuddy/artifacts/trading/index.json
```

2. **安装 AAM SKILL**:
```bash
# AAM SKILL 已在 ~/.workbuddy/skills/artifact-alignment-manager/
# 确认 sync_artifact.py 存在
ls -la ~/.workbuddy/scripts/sync_artifact.py
```

### 产物投递流程

1. **生成产物后自动投递**:
```python
# 在 SKILL 中调用
from sync_artifact import sync_to_artifact_hub

sync_to_artifact_hub(
    category="trading",
    file_path="/path/to/a1_report.md",
    metadata={
        "chain_phase": "A1",
        "tags": ["BTC", "research"]
    }
)
```

2. **手动同步产物索引**:
```bash
python3 ~/.workbuddy/scripts/sync_artifact.py --sync
```

---

## 🔗 相关文档

- [AAM SKILL](../skills/artifact-alignment-manager/)
- [产物中心维护 SKILL](../skills/dream-product-hub-maintenance/)
- [Dream Universal Gateway](../3-FRONTEND/dream-universal-gateway/)
- [前端系统设计](../3-FRONTEND/FRONTEND_SYSTEM.md)

---

## 📊 维护记录

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-05-14 | v1.0 | 初始版本 |
