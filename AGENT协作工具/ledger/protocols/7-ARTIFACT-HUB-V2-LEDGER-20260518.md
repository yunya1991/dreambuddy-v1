# 7-ARTIFACT-HUB-V2 账本清单协议 — 20260518

> 生成时间：2026-05-18T15:00:00.000Z  
> 来源文档：1-ARCHITECTURE/中台设计/ + 7-ARTIFACT-HUB-V2/ 设计文档（7份）  
> Goal ID：ahv2-impl-20260518  
> 工作区：7-ARTIFACT-HUB-V2  
> 账本 SHA：（见推送后 index.json）

---

## 实现基线（已完成，不纳入任务）

| 制品 | 状态 |
|------|------|
| Hub 核心服务（index.ts, artifact-store.ts, meta-store.ts, router-engine.ts） | ✅ 已实现 |
| Phase 1 类型（Department, Intent, Decision, Execution, Artifact, Audit） | ✅ 已实现 |
| Phase 3 类型（BoardProposal, ApprovalGate, ExecutionReview）+ SQLite 表 | ✅ 已实现 |
| REST API：GET /health, POST /route/decide|execute, GET /traces/:traceId | ✅ 已实现 |
| GET /chain/reviews, GET /chain/artifacts?groupByWorkflowType | ✅ 已实现 |
| failClosedCheck(), DecisionLevel L1/L2/L3, MinisterAgent enum | ✅ 已实现 |
| 6 份设计规范文档（GOVERNANCE_SPEC, OBJECT_MODEL, CHAIN_WORKFLOWS 等） | ✅ 已完成 |

---

## 任务清单

| Task ID | 标题 | 状态 | 类型 | 负责 AGENT | 依赖 |
|---------|------|------|------|-----------|------|
| `task-ahv2-impl-20260518-root-0` | 7-ARTIFACT-HUB-V2 未完成实现总目标 | planned | serial | Governance | — |
| `task-ahv2-impl-20260518-ops-ui-svc-1` | Phase 1: ops-ui 服务骨架与核心 API | planned | serial | Developer | task-ahv2-impl-20260518-root-0 |
| `task-ahv2-impl-20260518-ops-ui-skeleton-1a` | 创建 ops-ui Node.js/TypeScript 服务骨架（package.json, ts… | planned | parallel | Developer | task-ahv2-impl-20260518-ops-ui-svc-1 |
| `task-ahv2-impl-20260518-ops-ui-health-api-1b` | 实现 GET /api/ops/health 端点（运行时指标、队列深度、策略库统计） | planned | parallel | Developer | task-ahv2-impl-20260518-ops-ui-skelet... |
| `task-ahv2-impl-20260518-ops-ui-queue-api-1c` | 实现 GET /api/ops/queues 与 GET /api/ops/strategy-lib… | planned | parallel | Developer | task-ahv2-impl-20260518-ops-ui-skelet... |
| `task-ahv2-impl-20260518-ops-ui-proxy-api-1d` | 实现代理端点：POST /api/ops/route/decide|execute，GET /api… | planned | parallel | Developer | task-ahv2-impl-20260518-ops-ui-skelet... |
| `task-ahv2-impl-20260518-ops-ui-web-2` | Phase 2: ops-ui Web 页面层 | planned | serial | Developer | task-ahv2-impl-20260518-ops-ui-svc-1 |
| `task-ahv2-impl-20260518-ops-ui-console-2a` | 实现治理控制台主页 `/`（队列监控 + 策略库 + 系统健康三栏布局） | planned | parallel | Developer | task-ahv2-impl-20260518-ops-ui-web-2 |
| `task-ahv2-impl-20260518-ops-ui-map-2b` | 实现 UI 地图页 `/ui-map`（架构原型可视化）与前端构建配置 | planned | parallel | Developer | task-ahv2-impl-20260518-ops-ui-web-2 |
| `task-ahv2-impl-20260518-chain-dual-3` | Phase 3: /chain 双工作流可视化 | planned | serial | Developer | task-ahv2-impl-20260518-root-0 |
| `task-ahv2-impl-20260518-chain-wf-field-3a` | 将 workflow_id / workflow_type 字段写入 artifact-store.… | planned | parallel | Developer | task-ahv2-impl-20260518-chain-dual-3 |
| `task-ahv2-impl-20260518-chain-fe-route-3b` | 实现 /chain 前端路由页（3-FRONTEND）及双工作流并排布局组件 | planned | parallel | Developer | task-ahv2-impl-20260518-chain-wf-fiel... |
| `task-ahv2-impl-20260518-chain-card-comp-3c` | 实现 legacy_chain 与 trading_v2 工作流卡片组件（标题、步骤列表、状态标签） | planned | parallel | Developer | task-ahv2-impl-20260518-chain-dual-3 |
| `task-ahv2-impl-20260518-market-ui-4` | Phase 4: 市场控制台前端页面 | planned | serial | Developer | task-ahv2-impl-20260518-root-0 |
| `task-ahv2-impl-20260518-market-content-4a` | 实现内容池页面（内容列表 + 标签过滤）与用户分层页面 | planned | parallel | Developer | task-ahv2-impl-20260518-market-ui-4 |
| `task-ahv2-impl-20260518-market-route-4b` | 实现内容路由页面（路由决策可视化）与推送分发页面 | planned | parallel | Developer | task-ahv2-impl-20260518-market-ui-4 |
| `task-ahv2-impl-20260518-market-audit-4c` | 实现投放管理、效果反馈、分发审计三页面 | planned | parallel | Developer | task-ahv2-impl-20260518-market-ui-4 |
| `task-ahv2-impl-20260518-board-ui-5` | Phase 5: 管委会控制台前端 | planned | serial | Developer | task-ahv2-impl-20260518-root-0 |
| `task-ahv2-impl-20260518-board-list-5a` | 实现 BoardProposal 列表页与详情页（提案内容 + 证据展示） | planned | parallel | Developer | task-ahv2-impl-20260518-board-ui-5 |
| `task-ahv2-impl-20260518-board-approval-5b` | 实现 ApprovalGate L3 审批 UI（审批表单 + 批准/驳回操作） | planned | parallel | Developer | task-ahv2-impl-20260518-board-ui-5 |
| `task-ahv2-impl-20260518-board-review-5c` | 实现 ExecutionReview 评审页（执行效果回顾 + 评分）与 ApprovalGate … | planned | parallel | Developer | task-ahv2-impl-20260518-board-ui-5 |
| `task-ahv2-impl-20260518-phase2-obj-6` | Phase 6: Phase 2 对象实现（Distribution / Performance /… | planned | serial | Developer | task-ahv2-impl-20260518-root-0 |
| `task-ahv2-impl-20260518-dist-obj-6a` | 实现 Distribution 对象（TypeScript 类型 + SQLite 表 + 路由逻辑… | planned | parallel | Developer | task-ahv2-impl-20260518-phase2-obj-6 |
| `task-ahv2-impl-20260518-perf-obj-6b` | 实现 Performance 对象（TypeScript 类型 + SQLite 表 + 查询 AP… | planned | parallel | Developer | task-ahv2-impl-20260518-phase2-obj-6 |
| `task-ahv2-impl-20260518-market-intel-6c` | 实现 MarketIntel 对象（TypeScript 类型 + SQLite 表 + 写入 AP… | planned | parallel | Developer | task-ahv2-impl-20260518-phase2-obj-6 |
| `task-ahv2-impl-20260518-feed-restore-7` | Phase 7: /feed 路由恢复与增强 | planned | serial | Developer | task-ahv2-impl-20260518-root-0 |
| `task-ahv2-impl-20260518-feed-route-7a` | 恢复 3-FRONTEND/dream-universal-gateway 中 /feed 路由配置… | planned | parallel | Developer | task-ahv2-impl-20260518-feed-restore-7 |
| `task-ahv2-impl-20260518-feed-design-7b` | 编写 /feed 增强设计文档（路由策略、组件边界、数据源规范） | planned | parallel | Ledger/Protocol | task-ahv2-impl-20260518-feed-restore-7 |

---

## 阶段说明

| 阶段 | 范围 | 并行度 | 共享文件 |
|------|------|-------|---------|
| Phase 1 ops-ui 服务 | src/ops-ui/ 骨架 + 7 个 API 端点 | 4 并行子任务 | src/index.ts（代理端点） |
| Phase 2 ops-ui Web | 治理控制台主页 + UI地图页 | 2 并行子任务 | 无 |
| Phase 3 /chain 双工作流 | artifact-store 字段扩展 + 前端路由 | 3 并行子任务 | src/artifact-store.ts, src/types.ts |
| Phase 4 市场控制台 | 7 个市场页面 | 3 并行子任务 | 无 |
| Phase 5 管委会前端 | BoardProposal/ApprovalGate/ExecutionReview 页面 | 3 并行子任务 | 无 |
| Phase 6 Phase 2 对象 | Distribution/Performance/MarketIntel 类型+表+API | 3 并行子任务 | src/types.ts, src/meta-store.ts |
| Phase 7 /feed 恢复 | 路由恢复 + 设计文档 | 2 并行子任务 | 无 |

---

## 强同步节点

- **Phase 3 启动前**：`artifact-store.ts` + `src/types.ts` 字段扩展需 DESIGN_REVIEW（共享文件）
- **Phase 6 启动前**：`src/types.ts` + `src/meta-store.ts` 扩展需 DESIGN_REVIEW
- **合入 main**：任何 Phase 完成后需 Governance AGENT 执行 `gh pr merge --squash`

---

## 同步状态

- 最后同步时间：2026-05-18T15:00:00.000Z
- 工作区路径：7-ARTIFACT-HUB-V2
- 同步触发：CLI（手动生成）
- 账本 index.json SHA：（推送后更新）