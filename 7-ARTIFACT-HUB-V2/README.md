# 7-ARTIFACT-HUB-V2

`7-ARTIFACT-HUB-V2` 当前不再只是“产物中台 + 路由服务”，而是正在升级为一个由公司治理架构驱动的 AI 中枢系统。

它统一承接：

- 研究中台；
- 市场化中台；
- 交易链路监控；
- 治理控制台；
- HR 绩效与组织优化；
- 市场情报与外部竞争；
- 董事会（治理委员会）总览与人工审批。

详细设计见：

- [治理中枢化设计](file:///Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/docs/superpowers/specs/2026-05-16-artifact-hub-v2-governance-central-design.md)
- [公司中枢设计](file:///Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/1-ARCHITECTURE/中台设计/COMPANY_CENTRAL_HUB.md)
- [Ops Console 设计](file:///Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/docs/superpowers/specs/2026-05-15-artifact-hub-v2-ops-console-design.md)
- [Ops UI 说明](file:///Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/7-ARTIFACT-HUB-V2/OPS_UI_README.md)
- [市场化中台设计](file:///Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/7-ARTIFACT-HUB-V2/MARKET_CONSOLE_DESIGN.md)
- [董事会总览台设计](file:///Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/7-ARTIFACT-HUB-V2/BOARD_CONSOLE_DESIGN.md)

## 1. 系统定位

当前阶段，`7-ARTIFACT-HUB-V2` 的系统定位是：

- 一个共享底层能力的中枢系统；
- 一套代码、双中台入口；
- 研究内容治理与市场化运营分发并存；
- 保留现有 `/feed` 和 `/chain` 基线；
- 用 route/trace/event/task/result/audit 统一治理 AI 黑箱。

## 2. 核心治理目标

系统需要统一解决四类黑箱：

- `决策黑箱`：为什么这样判断、推荐、路由；
- `执行黑箱`：调用了什么链路、写了什么任务、产出了什么结果；
- `分发黑箱`：为什么把哪些内容推给哪些人；
- `审计黑箱`：如何回放、复盘、问责。

## 3. 组织模型

第一版按 6 个部门建模：

- `研究部`
- `交易部`
- `治理部`
- `运营部`
- `HR`
- `市场部`

并在其上增加由 6 位部长 Agent 组成的“六人董事会（治理委员会）”：

- 处理小问题；
- 协调中问题；
- 将重大事项上报人工审批。

## 4. 双中台与链路页面

### 研究中台

- 以现有 `/feed` 为基线；
- 保留旧版产物中台的内容治理与 Feed/详情页心智。

### 市场化中台

- 面向内部销售/运营；
- 重点做内容路由、用户分层、推送分发、投放管理、分发审计。

### 交易链路监控

- 以现有 `/chain` 为核心工作流监控页；
- 保留现有交易闭环工作流；
- 逐步新增基于 `6-TRADING` 的第二套交易工作流；
- 用可视化工作流展示检测链路畅通性。

### 治理控制台

- 独立入口：`ops-ui`
- 用于健康检查、Route Sandbox、Trace 回放、策略库、归档治理。

## 5. 单一真相源

系统正式以以下路径为共享底座：

- Artifacts root: `../dreambuddy/artifacts`
- Meta DB: `../dreambuddy/meta/artifact_hub.sqlite`
- Config root: `../dreambuddy/config`

所有双中台、双交易工作流、治理对象、队列与归档，都应优先收敛到这一套 repo-local 路径，不继续扩散旧 `~/.workbuddy` 目录心智。

## 6. 运行方式

### Hub 服务

```bash
cd 7-ARTIFACT-HUB-V2
npm install
npm run build
node dist/index.js
```

### Ops UI

```bash
cd 7-ARTIFACT-HUB-V2
npm install
npm run build
npm run start:ops
```

## 7. 核心 API

### Hub API

- `GET /health`
- `POST /route/decide`
- `POST /route/execute`
- `GET /traces/:traceId`
- `GET /events/stream?traceId=...` (SSE)

### Ops UI

- `GET /`
- `GET /ui-map`
- `GET /health`
- `GET /api/ops/health`
- `GET /api/ops/queues`
- `GET /api/ops/strategy-library`
- `GET /api/ops/strategy-library/file?id=...`
- `GET /api/ops/strategy-stats`
- `POST /api/ops/route/decide`
- `POST /api/ops/route/execute`
- `GET /api/ops/traces/:traceId`

## 8. Producer Contract (tasks/results)

### Task file

Path: `dreambuddy/artifacts/tasks/task_<taskId>.json`

建议字段：

- `trace_id`
- `task_id`
- `created_at`
- `intent`
- `routing_plan`

### Result file

Path: `dreambuddy/artifacts/results/result_<taskId>.json`

当前最小字段：

```json
{ "trace_id": "...", "task_id": "...", "status": "completed" }
```

后续建议统一扩展：

- `workflow_id`
- `workflow_type`
- `department`
- `schema_version`
- `policy_version`
- `producer`
- `timestamp`

## 9. 下一步文档化方向

当前已补齐：

- [GOVERNANCE_SPEC.md](file:///Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/7-ARTIFACT-HUB-V2/GOVERNANCE_SPEC.md)
- [OBJECT_MODEL.md](file:///Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/7-ARTIFACT-HUB-V2/OBJECT_MODEL.md)
- [CHAIN_WORKFLOWS.md](file:///Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/7-ARTIFACT-HUB-V2/CHAIN_WORKFLOWS.md)
- [OPS_UI_README.md](file:///Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/7-ARTIFACT-HUB-V2/OPS_UI_README.md)
- [MARKET_CONSOLE_DESIGN.md](file:///Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/7-ARTIFACT-HUB-V2/MARKET_CONSOLE_DESIGN.md)
- [BOARD_CONSOLE_DESIGN.md](file:///Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/7-ARTIFACT-HUB-V2/BOARD_CONSOLE_DESIGN.md)

建议继续补齐：

- 审批票据与 proposal schema 设计文档
- 研究中台 `/feed` 恢复与增强设计文档
- `/chain` 页面实现改造计划
