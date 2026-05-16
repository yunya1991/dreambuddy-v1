# AGENT 协作工具

本目录存放 Claude Code 与 Solo 双代理协作所用的共同工具与规范。

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
- `AGENT协作工具/docs/dual-agent-collaboration-foundation-design.md`：双代理协作底座设计
- `AGENT协作工具/docs/agent-standard-dev-lifecycle-design.md`：标准开发生命周期与协作监督体系设计
- `AGENT协作工具/docs/agent-standard-dev-lifecycle-implementation-plan.md`：标准开发生命周期实施计划

原 `docs/superpowers/` 下的对应文档当前保留兼容壳，用于承接历史链接与旧 PR 讨论。

## 使用规则

1. **每次任务开始前**，两个 agent 都必须运行冲突门禁检查
2. 输出 `BLOCK` 时任务**必须暂停**，不得绕过
3. 门禁结果为 `SAFE` 或 `WARNING` 后，必须先在当前协作 PR 发 `STARTED` 评论，再开始修改文件
4. 任务范围变化必须发 `UPDATED` 评论；任务阻塞必须发 `BLOCKED` 评论；任务完成后必须发 `DONE` 评论
5. `gatekeeper_config.json` 是双方共同维护的边界协议，变更需经双方确认
6. Solo 拉取本目录后与 Claude Code 共同遵守

## 快速使用

```bash
python3 AGENT协作工具/SKILLS/dual-agent-conflict-gate/conflict_gate.py \
  --agent claude \
  --task "你的任务名称" \
  --files "计划修改的文件,逗号分隔" \
  --contracts "依赖的契约名"
```

## PR 评论协作模板

### STARTED

```md
[协作开工声明 / STARTED]

Agent: SOLO | Claude Code
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

Agent: <SOLO | Claude Code>
任务: <任务名称>
提交: <commit sha>
已完成:
- <完成项 1>
- <完成项 2>
状态: DONE
说明: 另一代理可以基于最新 PR head 继续。
```
