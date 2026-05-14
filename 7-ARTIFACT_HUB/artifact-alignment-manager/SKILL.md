# 产物投递管理 SKILL v7.3

> **SKILL 类型**：执行型 + 验证型（AI 读取后按指令操作）
> **调用方式**：自动化任务 Prompt 中写 "读取 artifact-alignment-manager SKILL 并按执行协议操作"
> **触发词**：产物投递、投递验证、归档检查、delivery check、frontmatter检查、前端同步、产物中心、时间戳检查、ts规范、排序问题、产物排序
> **最高原则**：以本SKILL为产物投递的最高规范，所有自动化任务必须遵循

---

## 一、核心职责

**本 SKILL 整合了产物投递执行和验证功能：**

| 功能 | 说明 |
|:-----|:-----|
| **投递执行** | 调用 `sync_artifact.py` 自动同步到前端产物中心 |
| **投递验证** | 检查 frontmatter 完整性、index.json 状态、前端可见性 |
| **时间戳规范化** | 统一收口，所有时间戳必须通过本 SKILL 规范化 |
| **双通道保证** | 秘书邮箱 + 前端产物中心，缺一不可 |

---

## 二、投递双通道

A0-A9 产物有**两个投递目标**：

| 通道 | 路径 | 用途 |
|------|------|------|
| 秘书邮箱 | `~/.workbuddy/skills/boss-secretary/reports/trading/` | 报告归档、邮件分发 |
| 前端产物中心 | `~/.workbuddy/artifacts/{category}/` | localhost:3456 展示 |

> **⚠️ 每次投递必须同时写入两个通道！缺一不可。**

---

## 三、时间戳规范（统一收口）

### 3.1 为什么需要统一收口

不同系统生成时间戳格式不一致会导致：
- 前端日期显示错误（如 `2026-05-06` 被解析为 `08:00`）
- 筛选和排序逻辑混乱
- AAM 成为唯一时间戳规范来源

### 3.2 规范格式

| 格式 | 示例 | 用途 |
|------|------|------|
| **标准格式** | `2026-05-06T17:54:15+08:00` | frontmatter `date` 字段 |
| **纯日期格式** | `2026-05-06` | 仅日期无时间的场景 |
| **紧凑格式** | `20260506_175415` | 文件名中的时间戳 |

**规范要点**：
- ✅ 使用北京时间（UTC+8）
- ✅ 标准格式必须包含时区 `+08:00`
- ✅ 纯日期格式用于无时间部分的场景
- ❌ 禁止使用模糊格式（如 `05-06`、`今天`）
- ❌ 禁止使用 UTC 而不转换

### 3.3 工具函数

**Python 调用**：
```python
from sync_artifact import normalize_timestamp, validate_timestamp_format

# 生成当前时间的规范格式
ts_iso = normalize_timestamp()  # "2026-05-06T17:54:15+08:00"
ts_date = normalize_timestamp(output_format="date_only")  # "2026-05-06"
ts_compact = normalize_timestamp(output_format="compact")  # "20260506_175415"

# 验证并规范化
is_valid, normalized, msg = validate_timestamp_format("2026-05-06T10:00:00")
```

**CLI 调用**：
```bash
# 验证单个时间戳
python3 ~/.workbuddy/scripts/sync_artifact.py --check-ts "2026-05-06"

# 批量规范化 index.json
python3 ~/.workbuddy/scripts/sync_artifact.py --normalize-index ~/.workbuddy/artifacts/trading/index.json
```

### 3.4 AI 生成产物时的强制要求

**所有 AI 生成的产物，frontmatter 的 `date` 字段必须使用规范格式：**

```yaml
---
title: "A1 深度调研 2026-05-06"
date: "2026-05-06T17:54:15+08:00"  # 必须！使用规范格式
---
```

**正确示范**：
```yaml
date: "2026-05-06T17:54:15+08:00"  # ✅ 标准格式
date: "2026-05-06"                 # ✅ 纯日期
```

**错误示范**：
```yaml
date: "2026-05-06 17:54:15"        # ❌ 空格分隔，无时区
date: "17:54:15"                   # ❌ 只有时间
date: "今天"                       # ❌ 模糊格式
date: "2026/05/06"                 # ❌ 斜杠分隔
date: "2026-5-6T10:00:00"          # ❌ 月/日补零缺失
date: "2026-05-06T10:00:00Z"      # ❌ UTC时区未转换
date: "May 6, 2026"                # ❌ 英文格式
date: "1715068455"                 # ❌ Unix时间戳
```

### 3.5 严格规范检查（强制执行）

**🔴 P0 检查项（必须通过，否则禁止投递）**：

| 检查项 | 检查规则 | 检查命令 |
|--------|----------|----------|
| frontmatter date 字段存在 | 必须存在，不能为空 | `grep -E "^date:" <file>` |
| frontmatter date 格式正确 | 必须匹配 `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}$` | 见下方命令 |
| 无时区必须转换 | UTC时间必须转换为 +08:00 | 手动转换或用工具 |
| 月/日必须补零 | `05` 而非 `5` | 正则验证 |

**🔴 P0 规范检查正则**：
```bash
# 检查 frontmatter date 字段格式（严格）
grep -A1 "^date:" <file> | grep -v "^date:" | grep -v "^---" | while read ts; do
  if ! echo "$ts" | grep -qE '^\s*"?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}"?\s*$'; then
    echo "🔴 P0违规: $ts"
    exit 1
  fi
done
```

**🟡 P1 检查项（警告，不阻止但需修复）**：

| 检查项 | 检查规则 | 建议 |
|--------|----------|------|
| index.json date 一致性 | 必须与 frontmatter date 完全一致 | 重新 sync |
| 文件名时间戳格式 | 建议使用 `YYYYMMDD_HHMMSS` | 统一格式 |
| 历史产物时间戳 | 批量检测旧文件 | 逐步修复 |

### 3.6 违规处理

| 违规等级 | 判定条件 | 处理方式 |
|----------|----------|----------|
| 🔴 P0 致命 | frontmatter date 缺失/格式错误 | **禁止投递**，必须修复后重试 |
| 🟡 P1 警告 | index.json 与 frontmatter 不一致 | 修复后重新 sync |
| 🟢 P2 建议 | 文件名时间戳格式不统一 | 记录，下次注意 |

**P0 违规示例**：
```yaml
# ❌ P0 致命违规（禁止投递）
---
title: "A1 调研报告"
date: ""                    # 缺失
---

# ❌ P0 致命违规（禁止投递）
date: "2026-5-7"            # 格式错误

# ✅ P0 合规
date: "2026-05-07T15:53:28+08:00"
```

### 3.7 批量时间戳验证脚本

**验证所有产物的时间戳格式**：
```bash
#!/bin/bash
# validate_all_timestamps.sh - 批量验证时间戳
ERRORS=0
for f in ~/.workbuddy/artifacts/*/*.md; do
  ts=$(grep -m1 "^date:" "$f" | sed 's/^date:.*"\(.*\)".*/\1/')
  if ! echo "$ts" | grep -qE '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}$'; then
    echo "🔴 $f: $ts"
    ERRORS=$((ERRORS+1))
  fi
done
echo "共 $ERRORS 个时间戳违规"
```

**验证 index.json 完整性**：
```bash
#!/bin/bash
# validate_index_json.sh - 验证index.json
ERRORS=0
for idx in ~/.workbuddy/artifacts/*/index.json; do
  while IFS= read -r item; do
    date=$(echo "$item" | python3 -c "import sys,json; print(json.load(sys.stdin).get('date',''))")
    if ! echo "$date" | grep -qE '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}$'; then
      echo "🔴 index违规: $date"
      ERRORS=$((ERRORS+1))
    fi
  done < <(cat "$idx" | python3 -c "import sys,json; [print(json.dumps(i)) for i in json.load(sys.stdin)]")
done
echo "index.json 共 $ERRORS 个时间戳违规"
```

---

## 四、SKILL 执行协议（AI 必读）

### 4.1 何时调用此 SKILL

当自动化任务 **生成新产物（报告/日志/审计文件）** 时，必须调用此 SKILL 完成投递。

### 4.2 调用后执行流程

```
[AI 生成产物] → [时间戳规范检查 P0] → [生成规范时间戳] → [读取本 SKILL] → [执行投递] → [验证检查] → [返回结果]
```

**⚠️ 前置必须项**：
- **投递前必须先执行 P0 时间戳检查**
- 检查 frontmatter `date` 字段格式是否合规
- 不合规时 **禁止投递**，必须修复后重试
- **必须使用 `normalize_timestamp()` 生成规范时间戳**
- 同步失败时 **必须告警**，不允许静默失败
- 规则变更 **只需改此 SKILL**，所有调用方自动生效

---

## 五、Frontmatter 规范

### 5.1 A系列产物 Frontmatter 模板

```yaml
---
title: "A1 深度调研 YYYY-MM-DD HH:MM"
department: trading
chain_phase: A1           # 必须！A0-A9
date: "YYYY-MM-DDTHH:MM:SS+08:00"  # 必须！使用规范格式
type: research_report
status: completed
tags: "a1 research 调研"
by_a_phase: A1             # 必须！前端统计用
---
```

### 5.2 A系列类型映射

| chain_phase | type | department | 前端标签 |
|-------------|------|------------|---------|
| A0 | contradiction_theory | governance | a0, 矛盾论 |
| A1 | research_report | trading | a1, 调研 |
| A2 | first_principles | trading | a2, 第一性原理 |
| A3 | strategy | trading | a3, 推演 |
| A4 | validation_report | trading | a4, 验证 |
| A5 | execution_report | trading | a5, 执行 |
| A6 | intelligence_brief | trading | a6, 情报 |
| A7 | practice_theory | governance | a7, 实践论 |
| A8 | verification_report | governance | a8, 自检 |
| A9 | exit_decision | trading | a9, 离场 |
| dream | dream_journal | dream | dream, 做梦 |

---

## 六、产物投递执行模板（AI 按此操作）

### 6.1 完整投递流程

```
步骤1：P0 时间戳规范检查（前置，必须通过）
   ↓
步骤2：生成规范时间戳（使用 normalize_timestamp()）
   ↓
步骤3：确定文件名和所属部门
   ↓
步骤4：保存到对应部门子目录
   ↓
步骤5：调用 sync_artifact.py 同步到前端（自动化）
   ↓
步骤6：验证（frontmatter + index.json + 前端可见性）
   ↓
步骤7：返回结果给调用方
```

### 6.2 时间戳生成代码模板

```python
from sync_artifact import normalize_timestamp

# 在生成产物时
current_time = normalize_timestamp()  # "2026-05-06T17:54:15+08:00"

# frontmatter 中使用
frontmatter = f'''---
title: "A1 深度调研 {current_time[:10]}"
date: "{current_time}"
...
'''
```

### 6.3 步骤2-3：文件保存

**秘书目录根路径**：
```
~/.workbuddy/skills/boss-secretary/reports/
```

**部门投递映射表**（按文件名自动匹配）：

| 文件名模式 | 目标目录 | 部门 |
|:-----------|:---------|:-----|
| `a[0-9]_*`, `exit_check_*` | reports/trading/ | 📊 交易部 |
| `dream_journal_*`, `dream_insight_*`, `dream_gate_audit_*`, `dream_research_agenda_*`, `dream_brainstorm_*`, `oneirology_*` | reports/oneirology/ | 🌙 做梦部 |
| `audit_*`, `gate_audit_*` | reports/audit/ | 🔧 支撑部 |
| 其他 | reports/secretary/ | 🏛️ 秘书部 |

> **⚠️ 做梦部产物类型说明**：
> - `dream_journal_*` — 梦境日志（每日17:00自动执行）
> - `dream_insight_*` — 做梦洞察摘要
> - `dream_gate_audit_*` — 做梦部门禁审计报告
> - `dream_research_agenda_*` — 做梦部研究议程
> - `dream_brainstorm_*` — 做梦部头脑风暴
> - `oneirology_*` — 其他做梦部产物

### 6.4 步骤4：调用 sync_artifact.py 同步

**命令模板**：
```bash
# 方式1：同步单个新文件（自动分类）
python3 ~/.workbuddy/scripts/sync_artifact.py --source <文件路径>

# 方式2：批量同步所有秘书邮箱产物
python3 ~/.workbuddy/scripts/sync_artifact.py --mailbox
```

**执行后检查**：
- ✅ 输出包含 `"✅ 已复制"` 和 `"✅ 已添加索引"`
- ❌ 输出包含 `"❌"` 则同步失败，必须告警

### 6.5 步骤5：自动验证

```bash
# 验证前端可见性（文件名校验）
curl -s -o /dev/null -w "%{http_code}" http://localhost:3456/feed/trading/<文件名>

# 期望返回: 200
```

**验证通过标准**：
- ✅ sync_artifact.py 输出成功
- ✅ 前端详情页返回 200
- ✅ frontmatter 包含 chain_phase 和 tags

---

## 七、常见投递错误及修复

### 错误 1：投递到废弃目录

| 症状 | 根因 | 修复 |
|------|------|------|
| A1/A2/A3 产物不显示 | 投递到 `reports/research/` | 迁移到 `trading/` |
| A6 产物不显示 | 投递到 `reports/` 根目录 | 迁移到 `trading/` |

### 错误 2：Frontmatter 缺陷

| 症状 | 根因 | 修复 |
|------|------|------|
| 产物存在但A阶段过滤不中 | 缺 `chain_phase` 字段 | 补全 chain_phase |
| 产物完全不可见 | 无 frontmatter | 添加完整 YAML frontmatter |

### 错误 3：时间戳格式错误

| 症状 | 根因 | 修复 |
|------|------|------|
| 日期显示为"今天 08:00" | 纯日期被 JS 错误解析 | 使用 `normalize_timestamp()` |
| 时区显示不一致 | 缺少 `+08:00` | 使用标准格式 `YYYY-MM-DDTHH:MM:SS+08:00` |

### 错误 4：只输出到对话不落盘

| 阶段 | 症状 | 修复 |
|------|------|------|
| A9 | 25次运行仅JSON日志，无.md报告 | 同时生成 .md 报告 |

### 错误 5：index.json 手动写入导致排序混乱 ⚠️ P0 禁止

| 症状 | 根因 | 修复 |
|------|------|------|
| 最新产物未排在首位 | 手动写入纯日期格式 | **禁止手动写入 index.json，必须用 sync_artifact.py** |
| 同日产物排序混乱 | frontmatter 与 index.json date 不一致 | index.json 必须从 frontmatter 同步 |

**⚠️ P0 强制规范**：
- ❌ **禁止直接编辑 `index.json` 的 `date` 字段**
- ❌ **禁止使用纯日期格式 `2026-05-07` 写入 index.json**
- ✅ 必须调用 `sync_artifact.py --source <文件>` 自动同步
- ✅ 必须确保 frontmatter 的 `date` 字段是标准格式 `YYYY-MM-DDTHH:MM:SS+08:00`

### 错误 6：index.json 排序混乱（新产物未排在首位）⚠️ P0 修复

| 症状 | 根因 | 修复 |
|------|------|------|
| A2/A3/A9 最新产物未排在首位 | sync_artifact.py 使用 `append()` 而非排序 | **已修复：sync_artifact.py v5.3+ 在保存前自动按时间降序排序** |
| 老产物排在前面 | 同步时新条目添加到末尾 | 调用 `python3 sync_artifact.py --normalize-index <index.json>` 重新排序 |

**✅ 修复方案（v5.3+ 已内置）**：

`sync_artifact.py` 在同步时会自动按时间戳降序排序：
```python
# 保存索引前按时间戳降序排序（最新的在最前）
artifacts.sort(key=lambda x: x.get('date', ''), reverse=True)
save_index(category_dir, artifacts)
```

**手动修复已存在的排序问题**：
```bash
# 1. 规范化所有纯日期格式条目（从文件名提取时间）
python3 ~/.workbuddy/scripts/sync_artifact.py --normalize-index ~/.workbuddy/artifacts/trading/index.json

# 2. 验证排序是否正确（最新在前）
python3 -c "
import json
with open('~/.workbuddy/artifacts/trading/index.json') as f:
    data = json.load(f)
sorted_data = sorted(data, key=lambda x: x.get('date', ''), reverse=True)
for i, item in enumerate(sorted_data[:5]):
    print(f'{i+1}. [{item.get(\"chain_phase\")}] {item.get(\"date\")} - {item.get(\"title\", \"\")[:40]}')
"
```

**验证命令**：
```bash
# 检查 index.json 所有 date 字段格式
cat ~/.workbuddy/artifacts/trading/index.json | python3 -c "
import json,sys
data = json.load(sys.stdin)
for item in data:
    date = item.get('date','')
    if 'T' not in date:
        print(f'⚠️  {item.get(\"chain_phase\")}: {date}')
"
# 期望：无输出（所有 date 都是标准格式）
```

---

## 八、sync_artifact.py 命令速查

| 操作 | 命令 |
|:-----|:-----|
| 同步单个文件（自动分类） | `python3 ~/.workbuddy/scripts/sync_artifact.py --source <路径>` |
| 批量同步所有秘书邮箱产物 | `python3 ~/.workbuddy/scripts/sync_artifact.py --mailbox` |
| 验证同步状态 | `python3 ~/.workbuddy/scripts/sync_artifact.py --verify <目录>` |
| 验证单个时间戳格式 | `python3 ~/.workbuddy/scripts/sync_artifact.py --check-ts "<时间戳>"` |
| 批量规范化 index.json | `python3 ~/.workbuddy/scripts/sync_artifact.py --normalize-index <文件>` |
| 批量检查所有产物时间戳 | `bash ~/.workbuddy/skills/artifact-alignment-manager/validate_all_timestamps.sh` |
| 批量检查 index.json 时间戳 | `bash ~/.workbuddy/skills/artifact-alignment-manager/validate_index_json.sh` |

---

## 九、前端产物目录结构

```
~/.workbuddy/artifacts/
├── trading/index.json         # A0-A9系列
├── trading/a[0-9]_*.md
├── trading/exit_check_*.md
├── oneirology/index.json     # 做梦部
├── audit/index.json          # 支撑部
└── secretary/index.json      # 秘书部
```

---

## 十、自动化任务 Prompt 模板

```markdown
# <任务名称> - <执行频率>

## 执行步骤

### 1. 数据采集/处理
<具体执行步骤>

### 2. 时间戳规范检查（P0 前置）
```bash
# 检查产物 frontmatter date 格式
ts=$(grep -m1 "^date:" <生成文件> | sed 's/^date:.*"\(.*\)".*/\1/')
if ! echo "$ts" | grep -qE '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}$'; then
  echo "🔴 P0违规: 时间戳格式错误，禁止投递"
  exit 1
fi
```

### 3. 生成规范时间戳
```python
from sync_artifact import normalize_timestamp
current_time = normalize_timestamp()  # "2026-05-06T17:54:15+08:00"
```

### 4. 生成报告
- 文件名格式：`<类型>_<名称>_<YYYYMMDD_HHMMSS>.md`
- frontmatter 必须包含 chain_phase, tags, by_a_phase
- **date 字段必须使用 `current_time`**

### 4. 产物投递（必须执行）
读取 `artifact-alignment-manager` SKILL 并按执行协议操作：
1. 保存文件到 `reports/<部门>/`
2. 调用 `sync_artifact.py --source <文件路径>`
3. 验证同步结果
4. 返回投递状态

### 5. 输出摘要
输出3-5句话摘要，包含：
- 报告核心结论
- 产物投递状态（成功/失败）
```

---

## 十一、URL投递验证（新增 v7.4）

> **🔴 问题**: A2小白版需要同步到 `http://8.209.238.108/market-research`，但可能重复投递或投递失败
> 
> **✅ 解决方案**: 在AAM SKILL中添加URL投递验证，确保：
> 1. 不重复投递（检查URL是否已存在该内容）
> 2. 投递后验证（HTTP状态码 + 内容匹配）
> 3. 失败告警（投递失败必须通知）

### 11.1 硬编码配置

**A2小白版推送配置（不可修改）**:

| 配置项 | 值 | 说明 |
|:-----|:---|:-----|
| **目标URL** | `http://8.209.238.108/market-research` | 前端展示页面 |
| **API地址** | `http://8.209.238.108/api/v1/admin/reports` | 后端API |
| **API Key** | `8F_yf4C57w13-HaF3Wlw40uRYcica4Tfn-c93EocnLo` | 鉴权密钥 |
| **检查路径** | `reports/trading/*_小白版.md` | 仅推送小白版 |

### 11.2 投递前检查（避免重复）

**检查逻辑**:
```python
import requests
import hashlib

API_BASE = "http://8.209.238.108"
API_KEY = "8F_yf4C57w13-HaF3Wlw40uRYcica4Tfn-c93EocnLo"

def check_duplicate(content):
    """检查内容是否已存在，避免重复投递"""
    # 计算内容哈希
    content_hash = hashlib.md5(content.encode()).hexdigest()
    
    # 获取已推送的报告列表
    headers = {"X-API-Key": API_KEY}
    r = requests.get(f"{API_BASE}/api/v1/admin/reports", headers=headers)
    
    if r.status_code == 200:
        reports = r.json()
        for report in reports:
            if report.get('content_hash') == content_hash:
                print(f"⚠️ 内容已存在，跳过投递 (ID: {report['id']})")
                return True  # 已存在
    return False  # 不存在，可以投递
```

**检查清单**:
- [ ] 内容哈希检查（避免完全相同的内容重复投递）
- [ ] 标题+日期检查（避免同一天重复投递）
- [ ] API响应检查（201=成功, 409=冲突）

### 11.3 投递后验证

**验证步骤**:
```python
def verify_delivery(report_id):
    """验证投递是否成功"""
    # 1. 检查API响应
    headers = {"X-API-Key": API_KEY}
    r = requests.get(f"{API_BASE}/api/v1/admin/reports/{report_id}", headers=headers)
    
    if r.status_code != 200:
        print(f"❌ 投递验证失败: HTTP {r.status_code}")
        return False
    
    # 2. 检查前端页面是否更新
    r2 = requests.get(f"{API_BASE}/market-research")
    if "A2第一性原理" in r2.text:
        print(f"✅ 前端页面已更新")
        return True
    else:
        print(f"⚠️ 前端页面未更新，但API已成功")
        return False
```

**验证标准**:
- ✅ API返回201 Created
- ✅ 返回的JSON包含有效ID
- ✅ 前端页面 `http://8.209.238.108/market-research` 能访问
- ✅ 页面内容包含报告标题

### 11.4 失败告警

**告警规则**:
```python
def delivery_alert(success, report_title):
    """投递失败告警"""
    if not success:
        # 告警方式1: 写入秘书邮箱待修复目录
        alert = f"""
❌ A2小白版投递失败

报告标题: {report_title}
目标URL: http://8.209.238.108/market-research
时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

建议操作:
1. 检查API服务是否可用: curl http://8.209.238.108/api/v1/health
2. 检查API Key是否有效
3. 手动推送: python3 scripts/push_reports_to_api.py --days 1
4. 查看AAM SKILL §十一 排查问题
"""
        # 写入待修复目录
        with open(os.path.expanduser('~/.workbuddy/skills/boss-secretary/pending_tasks/inbox/a2_delivery_failed.md'), 'w') as f:
            f.write(alert)
        
        # 告警方式2: 打印到控制台
        print(f"❌ 告警: A2小白版投递失败，已写入待修复目录")
        return False
    return True
```

### 11.5 完整投递流程（A2调用）

**A2 SKILL调用示例**:
```python
# 在A2 SKILL的Step 3中调用

from sync_artifact import normalize_timestamp
import requests
import hashlib

# 1. 读取小白版内容
xiaobai_file = f"reports/trading/a2_first_principles_{datetime.now().strftime('%Y%m%d_%H%M')}_小白版.md"
with open(xiaobai_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 2. 检查是否重复
content_hash = hashlib.md5(content.encode()).hexdigest()
if check_duplicate(content_hash):
    print(f"⚠️ 内容已存在，跳过投递")
    exit(0)

# 3. 推送
API_BASE = "http://8.209.238.108"
API_KEY = "8F_yf4C57w13-HaF3Wlw40uRYcica4Tfn-c93EocnLo"

payload = {
    "title": f"A2第一性原理分析 {datetime.now().strftime('%Y-%m-%d')}",
    "content": content,
    "category": "market-analysis",
    "tags": ["BTC", "A2", "第一性原理", datetime.now().strftime('%Y-%m-%d')],
    "content_hash": content_hash  # 用于去重
}

headers = {"X-API-Key": API_KEY, "Content-Type": "application/json"}
r = requests.post(f"{API_BASE}/api/v1/admin/reports", json=payload, headers=headers)

# 4. 验证
if r.status_code == 201:
    report_id = r.json().get('id')
    if verify_delivery(report_id):
        print(f"✅ 投递成功 + 验证通过 (ID: {report_id})")
    else:
        print(f"⚠️ 投递成功但验证失败 (ID: {report_id})")
        delivery_alert(False, payload['title'])
else:
    print(f"❌ 投递失败: HTTP {r.status_code}")
    delivery_alert(False, payload['title'])
```

---

## 十一、URL投递验证（v7.4）

> **🔴 问题**: A2小白版需要同步到 `http://8.209.238.108/market-research`，但可能重复投递或投递失败
> 
> **✅ 解决方案**: 在AAM SKILL中添加URL投递验证，确保：
> 1. 不重复投递（检查URL是否已存在该内容）
> 2. 投递后验证（HTTP状态码 + 内容匹配）
> 3. 失败告警（投递失败必须通知）

### 11.1 硬编码配置

**A2小白版推送配置（不可修改）**:

| 配置项 | 值 | 说明 |
|:-----|:---|:-----|
| **目标URL** | `http://8.209.238.108/market-research` | 前端展示页面 |
| **API地址** | `http://8.209.238.108/api/v1/admin/reports` | 后端API |
| **API Key** | `8F_yf4C57w13-HaF3Wlw40uRYcica4Tfn-c93EocnLo` | 鉴权密钥 |
| **检查路径** | `reports/trading/*_小白版.md` | 仅推送小白版 |

### 11.2 投递前检查（避免重复）

**检查逻辑**:
```python
import requests
import hashlib

API_BASE = "http://8.209.238.108"
API_KEY = "8F_yf4C57w13-HaF3Wlw40uRYcica4Tfn-c93EocnLo"

def check_duplicate(content):
    """检查内容是否已存在，避免重复投递"""
    # 计算内容哈希
    content_hash = hashlib.md5(content.encode()).hexdigest()
    
    # 获取已推送的报告列表
    headers = {"X-API-Key": API_KEY}
    r = requests.get(f"{API_BASE}/api/v1/admin/reports", headers=headers)
    
    if r.status_code == 200:
        reports = r.json()
        for report in reports:
            if report.get('content_hash') == content_hash:
                print(f"⚠️ 内容已存在，跳过投递 (ID: {report['id']})")
                return True  # 已存在
    return False  # 不存在，可以投递
```

**检查清单**:
- [ ] 内容哈希检查（避免完全相同的内容重复投递）
- [ ] 标题+日期检查（避免同一天重复投递）
- [ ] API响应检查（201=成功, 409=冲突）

### 11.3 投递后验证

**验证步骤**:
```python
def verify_delivery(report_id):
    """验证投递是否成功"""
    # 1. 检查API响应
    headers = {"X-API-Key": API_KEY}
    r = requests.get(f"{API_BASE}/api/v1/admin/reports/{report_id}", headers=headers)
    
    if r.status_code != 200:
        print(f"❌ 投递验证失败: HTTP {r.status_code}")
        return False
    
    # 2. 检查前端页面是否更新
    r2 = requests.get(f"{API_BASE}/market-research")
    if "A2第一性原理" in r2.text:
        print(f"✅ 前端页面已更新")
        return True
    else:
        print(f"⚠️ 前端页面未更新，但API已成功")
        return False
```

**验证标准**:
- ✅ API返回201 Created
- ✅ 返回的JSON包含有效ID
- ✅ 前端页面 `http://8.209.238.108/market-research` 能访问
- ✅ 页面内容包含报告标题

### 11.4 失败告警

**告警规则**:
```python
def delivery_alert(success, report_title):
    """投递失败告警"""
    if not success:
        # 告警方式1: 写入秘书邮箱待修复目录
        alert = f"""
❌ A2小白版投递失败

报告标题: {report_title}
目标URL: http://8.209.238.108/market-research
时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

建议操作:
1. 检查API服务是否可用: curl http://8.209.238.108/api/v1/health
2. 检查API Key是否有效
3. 手动推送: python3 scripts/push_reports_to_api.py --days 1
4. 查看AAM SKILL §十一 排查问题
"""
        # 写入待修复目录
        with open(os.path.expanduser('~/.workbuddy/skills/boss-secretary/pending_tasks/inbox/a2_delivery_failed.md'), 'w') as f:
            f.write(alert)
        
        # 告警方式2: 打印到控制台
        print(f"❌ 告警: A2小白版投递失败，已写入待修复目录")
        return False
    return True
```

### 11.5 完整投递流程（A2调用）

**A2 SKILL调用示例**:
```python
# 在A2 SKILL的Step 3中调用

from sync_artifact import normalize_timestamp
import requests
import hashlib

# 1. 读取小白版内容
xiaobai_file = f"reports/trading/a2_first_principles_{datetime.now().strftime('%Y%m%d_%H%M')}_小白版.md"
with open(xiaobai_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 2. 检查是否重复
content_hash = hashlib.md5(content.encode()).hexdigest()
if check_duplicate(content_hash):
    print(f"⚠️ 内容已存在，跳过投递")
    exit(0)

# 3. 推送
API_BASE = "http://8.209.238.108"
API_KEY = "8F_yf4C57w13-HaF3Wlw40uRYcica4Tfn-c93EocnLo"

payload = {
    "title": f"A2第一性原理分析 {datetime.now().strftime('%Y-%m-%d')}",
    "content": content,
    "category": "market-analysis",
    "tags": ["BTC", "A2", "第一性原理", datetime.now().strftime('%Y-%m-%d')],
    "content_hash": content_hash  # 用于去重
}

headers = {"X-API-Key": API_KEY, "Content-Type": "application/json"}
r = requests.post(f"{API_BASE}/api/v1/admin/reports", json=payload, headers=headers)

# 4. 验证
if r.status_code == 201:
    report_id = r.json().get('id')
    if verify_delivery(report_id):
        print(f"✅ 投递成功 + 验证通过 (ID: {report_id})")
    else:
        print(f"⚠️ 投递成功但验证失败 (ID: {report_id})")
        delivery_alert(False, payload['title'])
else:
    print(f"❌ 投递失败: HTTP {r.status_code}")
    delivery_alert(False, payload['title'])
```

---

## 十二、腾讯云远端投递（新增 v7.6）

> **🔴 问题**: 所有A系列产物需要同步到腾讯云远端服务器 (http://49.233.123.96/feed)，但当前只支持本地artifacts目录
> 
> **✅ 解决方案**: 在AAM SKILL中添加腾讯云远端投递支持，确保：
> 1. 所有产物自动同步到腾讯云远端
> 2. 投递后验证（HTTP状态码 + 内容匹配）
> 3. 失败告警（投递失败必须通知）
> 4. 与本地投递并行执行，双通道保证

### 12.1 硬编码配置

**腾讯云远端投递配置（不可修改）**:

| 配置项 | 值 | 说明 |
|:-----|:---|:-----|
| **远端URL** | `http://49.233.123.96/feed` | 腾讯云前端展示页面 |
| **API地址** | `http://49.233.123.96/api/v1/artifacts` | 远端API |
| **API Key** | `dream-multiskill-2026` | 鉴权密钥 |
| **本地路径** | `~/.workbuddy/artifacts/` | 本地产物目录 |
| **远端路径** | `/var/www/product-hub/artifacts/` | 服务器产物目录 |

### 12.2 投递前检查

**检查逻辑**:
```python
import requests
import os

TENCENT_API_BASE = "http://49.233.123.96"
TENCENT_API_KEY = "dream-multiskill-2026"

def check_remote_artifact_exists(filename):
    """检查远端是否已存在该文件，避免重复投递"""
    headers = {"X-API-Key": TENCENT_API_KEY}
    r = requests.get(f"{TENCENT_API_BASE}/api/v1/artifacts/check?filename={filename}", headers=headers)
    
    if r.status_code == 200:
        result = r.json()
        if result.get('exists'):
            print(f"⚠️ 远端已存在 {filename}，跳过投递")
            return True  # 已存在
    return False  # 不存在，可以投递

def prepare_artifact_metadata(file_path):
    """准备产物元数据"""
    filename = os.path.basename(file_path)
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 提取frontmatter
    frontmatter = {}
    if content.startswith('---'):
        end_idx = content.find('---', 3)
        if end_idx != -1:
            fm_text = content[3:end_idx].strip()
            for line in fm_text.split('\n'):
                if ':' in line:
                    key, value = line.split(':', 1)
                    frontmatter[key.strip()] = value.strip().strip('"')
    
    return {
        "filename": filename,
        "content": content,
        "metadata": frontmatter,
        "size": os.path.getsize(file_path)
    }
```

**检查清单**:
- [ ] 文件名检查（避免同一文件重复投递）
- [ ] 内容哈希检查（避免完全相同的内容重复投递）
- [ ] API响应检查（201=成功, 409=冲突）
- [ ] 网络连通性检查（确保能访问49.233.123.96）

### 12.3 投递执行

**投递步骤**:
```python
def deliver_to_tencent_cloud(file_path):
    """投递产物到腾讯云远端服务器"""
    filename = os.path.basename(file_path)
    
    # 1. 检查是否已存在
    if check_remote_artifact_exists(filename):
        return True  # 已存在，跳过
    
    # 2. 准备元数据
    artifact_data = prepare_artifact_metadata(file_path)
    
    # 3. 推送到远端
    headers = {
        "X-API-Key": TENCENT_API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "filename": artifact_data["filename"],
        "content": artifact_data["content"],
        "metadata": artifact_data["metadata"],
        "category": determine_category(artifact_data["filename"])
    }
    
    r = requests.post(
        f"{TENCENT_API_BASE}/api/v1/artifacts",
        json=payload,
        headers=headers,
        timeout=30
    )
    
    # 4. 处理响应
    if r.status_code == 201:
        print(f"✅ 远端投递成功: {filename}")
        return True
    elif r.status_code == 409:
        print(f"⚠️ 远端已存在: {filename}")
        return True
    else:
        print(f"❌ 远端投递失败: HTTP {r.status_code}")
        return False

def determine_category(filename):
    """根据文件名确定分类"""
    if 'a0' in filename or 'contradiction' in filename:
        return 'governance'
    elif 'a1' in filename or 'research' in filename:
        return 'trading'
    elif 'a2' in filename or 'first_principles' in filename:
        return 'trading'
    elif 'a3' in filename or 'strategy' in filename:
        return 'trading'
    elif 'a4' in filename or 'validation' in filename:
        return 'trading'
    elif 'a5' in filename or 'execution' in filename:
        return 'trading'
    elif 'a6' in filename or 'intelligence' in filename:
        return 'trading'
    elif 'a7' in filename or 'practice' in filename:
        return 'governance'
    elif 'a8' in filename or 'verification' in filename:
        return 'governance'
    elif 'a9' in filename or 'exit' in filename:
        return 'trading'
    elif 'dream' in filename:
        return 'oneirology'
    else:
        return 'secretary'
```

### 12.4 投递后验证

**验证步骤**:
```python
def verify_remote_delivery(filename):
    """验证远端投递是否成功"""
    # 1. 检查API响应
    headers = {"X-API-Key": TENCENT_API_KEY}
    r = requests.get(
        f"{TENCENT_API_BASE}/api/v1/artifacts/{filename}",
        headers=headers
    )
    
    if r.status_code != 200:
        print(f"❌ 远端验证失败: HTTP {r.status_code}")
        return False
    
    # 2. 检查前端页面是否更新
    r2 = requests.get(f"{TENCENT_API_BASE}/feed")
    if r2.status_code == 200 and filename in r2.text:
        print(f"✅ 远端前端页面已更新")
        return True
    else:
        print(f"⚠️ 远端前端页面未更新，但API已成功")
        return False
```

**验证标准**:
- ✅ API返回201 Created
- ✅ 返回的JSON包含有效ID
- ✅ 远端前端页面 `http://49.233.123.96/feed` 能访问
- ✅ 页面内容包含新投递的产物

### 12.5 失败告警

**告警规则**:
```python
def tencent_delivery_alert(success, filename):
    """腾讯云投递失败告警"""
    if not success:
        # 告警方式1: 写入秘书邮箱待修复目录
        alert = f"""
❌ 腾讯云远端投递失败

文件名: {filename}
目标URL: http://49.233.123.96/feed
时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

建议操作:
1. 检查服务器是否可用: curl http://49.233.123.96/api/v1/health
2. 检查API Key是否有效
3. 检查网络连接: ping 49.233.123.96
4. 查看AAM SKILL §十二 排查问题
5. 手动上传: rsync -avz ~/.workbuddy/artifacts/ ubuntu@49.233.123.96:/var/www/product-hub/artifacts/
"""
        # 写入待修复目录
        alert_path = os.path.expanduser('~/.workbuddy/skills/boss-secretary/pending_tasks/inbox/tencent_delivery_failed.md')
        with open(alert_path, 'w') as f:
            f.write(alert)
        
        # 告警方式2: 打印到控制台
        print(f"❌ 告警: 腾讯云投递失败，已写入待修复目录")
        return False
    return True
```

### 12.6 完整投递流程（集成到sync_artifact.py）

**修改sync_artifact.py，添加腾讯云投递**:
```python
# 在sync_artifact.py的sync_file_to_category()函数末尾添加：

def sync_file_to_category(source_path, category_dir):
    """同步文件到本地分类目录，并投递到腾讯云远端"""
    
    # ... 原有的本地同步逻辑 ...
    
    # 新增：投递到腾讯云远端
    if os.getenv('ENABLE_TENCENT_DELIVERY', 'true').lower() == 'true':
        try:
            from tencent_delivery import deliver_to_tencent_cloud, verify_remote_delivery, tencent_delivery_alert
            
            # 投递到腾讯云
            if deliver_to_tencent_cloud(source_path):
                # 验证投递
                filename = os.path.basename(source_path)
                if verify_remote_delivery(filename):
                    print(f"✅ 腾讯云投递成功 + 验证通过")
                else:
                    print(f"⚠️ 腾讯云投递成功但验证失败")
                    tencent_delivery_alert(False, filename)
            else:
                filename = os.path.basename(source_path)
                tencent_delivery_alert(False, filename)
        except Exception as e:
            print(f"❌ 腾讯云投递异常: {e}")
    
    return True
```

### 12.7 手动投递命令

**新增sync_artifact.py参数**:
```bash
# 手动投递单个文件到腾讯云
python3 ~/.workbuddy/scripts/sync_artifact.py --source <文件> --tencent-delivery

# 批量投递所有本地产物到腾讯云
python3 ~/.workbuddy/scripts/sync_artifact.py --mailbox --tencent-delivery

# 仅验证腾讯云连接
python3 ~/.workbuddy/scripts/sync_artifact.py --check-tencent

# 仅投递到腾讯云，不同步到本地
python3 ~/.workbuddy/scripts/sync_artifact.py --source <文件> --tencent-only
```

### 12.8 腾讯云投递测试用例

**测试A1调研报告投递**:
```bash
# 1. 准备测试文件
A1_FILE="/Users/zhangjiangtao/WorkBuddy/20260415144304/reports/trading/a1_research_20260513_0117.md"

# 2. 执行投递（本地+远端）
python3 ~/.workbuddy/scripts/sync_artifact.py --source "$A1_FILE" --tencent-delivery

# 3. 验证远端
curl -s http://49.233.123.96/feed | grep "A1 市场调研报告"

# 4. 检查API
curl -s -H "X-API-Key: dream-multiskill-2026" http://49.233.123.96/api/v1/artifacts/trading/index.json | python3 -m json.tool | head -20
```

---

## 十三、版本历史

| 版本 | 日期 | 变更 |
|:-----|:-----|:-----|
| **v7.6** | **2026-05-13** | **新增§十二、腾讯云远端投递：所有产物同步到 `http://49.233.123.96/feed`，包含投递、验证、告警** |
| v7.5 | 2026-05-10 | 新增§十一、URL投递验证：A2小白版同步到 `http://8.209.238.108/market-research`，包含去重检查、投递验证、失败告警 |
| v7.4 | 2026-05-08 | 扩展做梦部产物类型：增加dream_gate_audit_、dream_research_agenda_、dream_brainstorm_等梦境部门产物分类 |
| v7.3 | 2026-05-07 | 新增"错误6：index.json排序混乱"章节，修复新产物未排在首位问题；sync_artifact.py v5.3内置自动排序 |
| v7.2 | 2026-05-07 | 新增"严格时间戳规范检查"章节：P0/P1/P2违规等级、强制正则检查、批量验证脚本、违规处理流程 |
| v7.1 | 2026-05-07 | 新增"错误5：index.json手动写入禁止规范"(P0)，禁止直接编辑index.json的date字段 |
| v7.0 | 2026-05-06 | 新增时间戳规范化规范，作为统一收口 |
| v6.0 | 2026-05-06 | 合并 `artifact-delivery-validator`，整合执行+验证功能 |
| v5.0 | 2026-05-05 | 新增公司架构与部门职责章节 |
| v4.0 | 2026-05-05 | 重构为执行型 SKILL |
| v3.0 | 2026-05-05 | 新增 governance/、文件名模式匹配 |
| v1.0 | 2026-05-05 | 初版建立 |

