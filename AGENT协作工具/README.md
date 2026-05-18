# AGENT 协作工具

本目录存放 AGENT 协作所用的共同工具与规范（兼容双 AGENT 场景）。

## 目录结构

```
AGENT协作工具/
└── SKILLS/
    └── dual-agent-conflict-gate/   ← 冲突前置门禁 SKILL
        ├── SKILL.md                ← SKILL 规范文档
        ├── gatekeeper_config.json  ← 主责域 / 共享文件 / 契约配置
        └── conflict_gate.py        ← Python 实现（CLI 可直接调用）
```

## 生命周期工具栈

标准研发协作体系采用“1 个主流程 SKILL + 4 个子 SKILL + 1 个开工前门禁”的结构：

- `agent-standard-dev-lifecycle`：总控主流程，编排阶段流转
- `agent-design-review`：方案评审
- `agent-dev-execution`：开发执行
- `agent-quality-test`：测试验证
- `agent-collab-supervisor`：流程监督与 GitHub 规则映射
- `dual-agent-conflict-gate`：开工前技术门禁

## 强制阶段

所有 AGENT 任务必须依次经过以下阶段：

1. `Phase 0` 任务登记
2. `Phase 1` 方案评审
3. `Phase 2` 实施计划
4. `Phase 3` 开工门禁
5. `Phase 4` 开发执行
6. `Phase 5` 测试验证
7. `Phase 6` PR 评审
8. `Phase 7` 合入监督
9. `Phase 8` 完成归档

## 主干文档

以下文档已作为全局 `AGENT` 协作主干迁入 `AGENT协作工具/docs/`：

- `AGENT协作工具/docs/README.md`：协作文档总入口
- `AGENT协作工具/docs/00-AGENT-CONSTITUTION.md`：协作宪法（fail-closed）
- `AGENT协作工具/docs/01-COLLABORATION-PROTOCOL.md`：协作协议（评论锚点 + 门禁）
- `AGENT协作工具/docs/04-ENGINEERING-INDEX.md`：工程索引（改哪里/查哪里）
- `AGENT协作工具/docs/05-FAQ.md`：FAQ（常见阻塞与修复）
- `AGENT协作工具/docs/06-SKILLS-INVENTORY.md`：SKILL 工具清单
- `AGENT协作工具/docs/dual-agent-collaboration-foundation-design.md`：双代理协作底座设计
- `AGENT协作工具/docs/agent-standard-dev-lifecycle-design.md`：标准开发生命周期与协作监督体系设计
- `AGENT协作工具/docs/agent-standard-dev-lifecycle-implementation-plan.md`：标准开发生命周期实施计划
- `AGENT协作工具/docs/agent-efficient-collaboration-mode.md`：高效协作模式与默认执行策略
- `AGENT协作工具/docs/agent-collaboration-system-v1-design.md`：AGENT协作系统 v1 设计
- `AGENT协作工具/docs/agent-collaboration-system-v1-implementation-plan.md`：AGENT协作系统 v1 实施计划
- `AGENT协作工具/docs/agent-collaboration-system-v1-governance-agent-implementation-plan.md`：治理 AGENT 增量实施计划
- [AGENT协作工具/docs/agent-collaboration-system-v1-governance-cycle-implementation-plan.md](docs/agent-collaboration-system-v1-governance-cycle-implementation-plan.md)：治理账本最小闭环控制器实施计划

原 `docs/superpowers/` 下的对应文档当前保留兼容壳，用于承接历史链接与旧 PR 讨论。

## 高效协作模式

当前协作体系采用“生命周期强门禁 + 默认并行执行”的组合策略：

- 生命周期阶段仍然保留，用于方案评审、测试验证、PR 评审与合入监督
- 默认执行策略切换为“owner 目录内并行开发”，不再要求为每个微小动作逐步等待
- 对错误导出、伪测试、导入路径、局部类型与构建依赖这类确定性问题，允许白名单直接接管
- 只有在共享文件、冻结契约、边界变更、主分支合并等关键节点才强制同步

详细规则见：`AGENT协作工具/docs/agent-efficient-collaboration-mode.md`

## 角色拆分（账本协议 / 治理）

为降低冲突处置与协议维护互相干扰，协作角色拆分为：

- 账本协议AGENT：维护任务清单与协议文档（不负责合并与冲突）
- 治理AGENT：负责合并门禁与冲突收口（不维护任务清单与协议字段）

详见：`AGENT协作工具/docs/agent-ledger-protocol-vs-governance-short-spec.md`

## 使用规则

1. **每次任务开始前**，参与任务的 AGENT 必须运行冲突门禁检查
2. 输出 `BLOCK` 时任务**必须暂停**，不得绕过
3. 门禁结果为 `SAFE` 或 `WARNING` 后，必须先在当前协作 PR 发 `STARTED` 评论，再开始修改文件
4. `STARTED / UPDATED / BLOCKED / DONE` 仍为强制广播层，但默认按阶段广播，不要求为每个微小动作单独评论
5. `gatekeeper_config.json` 是协作共同维护的边界协议，变更需经相关 owner 确认
6. 当前协作以 `7-ARTIFACT-HUB-V2` 为核心工作区，默认占用范围为 `7-ARTIFACT-HUB-V2/**`，每个 AGENT 自建 `agent/*` 分支并提独立 PR
7. 允许少量例外文件用于支撑 `7-ARTIFACT-HUB-V2` 的 build/test/运行，但必须在 `STARTED/UPDATED` 显式声明例外范围
8. owner 目录内默认并行开发；白名单直接接管项允许修复方直接接手，修后广播结果
9. 角色拆分与硬约束以主干短规范为准：`AGENT协作工具/docs/agent-ledger-protocol-vs-governance-short-spec.md`
10. 遇到阻塞先查文档再行动（作为 AGENT 记忆固定引用）：
    - 允许/禁止/裁决：`AGENT协作工具/docs/00-AGENT-CONSTITUTION.md`
    - 评论字段/模板/门禁：`AGENT协作工具/docs/01-COLLABORATION-PROTOCOL.md`
    - 改哪里/查哪里：`AGENT协作工具/docs/04-ENGINEERING-INDEX.md`
    - 常见失败：`AGENT协作工具/docs/05-FAQ.md`
    - SKILL 使用：`AGENT协作工具/docs/06-SKILLS-INVENTORY.md`

## 快速使用

```bash
python3 AGENT协作工具/SKILLS/dual-agent-conflict-gate/conflict_gate.py \
  --agent <agent_id> \
  --task "你的任务名称" \
  --files "计划修改的文件,逗号分隔" \
  --contracts "依赖的契约名"
```

## PR 评论协作模板

### STARTED

```md
[协作开工声明 / STARTED]

Agent: <agent_id>
任务: <任务名称>
分支: <agent/* 分支>
计划修改:
- <文件或目录 1>
- <文件或目录 2>

预期产出:
- <产出 1>
- <产出 2>

占用范围:
- <当前请勿并行修改的文件或目录>

冲突门禁结果:
- decision: SAFE | WARNING
- reason_codes: <如无可写 []>

状态: STARTED
说明: 在我发 DONE 评论前，请不要并行修改上述范围。
```

### DONE

```md
[协作完成回报 / DONE]

Agent: <agent_id>
任务: <任务名称>
提交: <commit sha>
已完成:
- <完成项 1>
- <完成项 2>
状态: DONE
说明: 另一代理可以基于最新 PR head 继续。
```
