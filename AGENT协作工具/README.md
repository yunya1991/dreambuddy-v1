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

## 使用规则

1. **每次任务开始前**，两个 agent 都必须运行冲突门禁检查
2. 输出 `BLOCK` 时任务**必须暂停**，不得绕过
3. `gatekeeper_config.json` 是双方共同维护的边界协议，变更需经双方确认
4. Solo 拉取本目录后与 Claude Code 共同遵守

## 快速使用

```bash
python3 AGENT协作工具/SKILLS/dual-agent-conflict-gate/conflict_gate.py \
  --agent claude \
  --task "你的任务名称" \
  --files "计划修改的文件,逗号分隔" \
  --contracts "依赖的契约名"
```
