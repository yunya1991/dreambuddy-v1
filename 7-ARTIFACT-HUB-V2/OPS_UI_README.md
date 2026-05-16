# 7-ARTIFACT-HUB-V2 Ops UI 说明

> 版本：v1.0  
> 更新日期：2026-05-16  
> 作用：说明 `ops-ui` 的定位、页面职责、接口边界与后续演进方向。

## 1. 定位

`ops-ui` 是 `7-ARTIFACT-HUB-V2` 的治理控制台前台。

它不是终端用户页面，而是：

- 治理部主视角页面；
- 路由、Trace、Queue、Strategy、Archive 的操作台；
- AI 黑箱治理的控制界面；
- 公司中枢的一部分。

当前默认入口：

- `http://127.0.0.1:3457/`
- `http://127.0.0.1:3457/ui-map`

## 2. 当前职责

当前 `ops-ui` 已承担以下职责：

- 聚合 Hub / Gateway / Queue 健康状态；
- 展示 tasks/results 队列快照；
- 提供 Route Sandbox；
- 代理 trace 查询；
- 提供经典策略库浏览；
- 代理策略统计接口；
- 提供可视化页面架构原型 `ui-map`。

## 3. 页面组成

### 3.1 `/`

当前主页定位为治理控制台。

已包含：

- `Aggregated Health`
- `Queues Snapshot`
- `Strategy Stats`
- `Route Sandbox`
- `Classic Strategy Library`

### 3.2 `/ui-map`

当前定位为设计与治理结构原型页。

已包含：

- Feed / Ops / Query / Hub / Data 的页面架构图；
- AI 黑箱治理总图；
- 双中台页面结构图；
- 治理对象模型图；
- 三类页面预览：
  - Feed 首页
  - Feed 详情页
  - Ops 首页

## 4. 接口边界

### 4.1 本地页面接口

当前 `ops-ui` 暴露：

- `GET /health`
- `GET /`
- `GET /ui-map`
- `GET /api/ops/health`
- `GET /api/ops/queues`
- `GET /api/ops/strategy-library`
- `GET /api/ops/strategy-library/file?id=...`
- `GET /api/ops/strategy-stats`
- `POST /api/ops/route/decide`
- `POST /api/ops/route/execute`
- `GET /api/ops/traces/:traceId`

### 4.2 上游依赖

`ops-ui` 当前依赖：

- Artifact Hub：默认 `127.0.0.1:8787`
- Gateway：默认 `127.0.0.1:3000`
- `dreambuddy/artifacts`
- `dreambuddy/meta`

### 4.3 安全边界

当前设计默认：

- 本机使用；
- 不做公网入口；
- `strategy-stats` 由服务端注入 `OPS_ADMIN_TOKEN`；
- 后续若扩展更多治理接口，应继续维持“服务端代持敏感令牌”的模式。

## 5. 在公司中枢中的角色

在新的公司中枢模型下，`ops-ui` 不只是运维页，而是治理部主视角。

它主要承担：

- 决策黑箱解释入口；
- 执行黑箱回放入口；
- 分发黑箱审计入口；
- 审计黑箱控制入口。

也就是说，未来 `ops-ui` 的上位定位是：

> 公司中枢中的治理控制台。

## 6. 与其他页面的关系

### 6.1 与研究中台的关系

- 研究中台负责内容消费与研究沉淀；
- `ops-ui` 负责解释这些研究产物背后的 route / trace / audit。

### 6.2 与 `/chain` 的关系

- `/chain` 负责交易工作流可视化与链路检测；
- `ops-ui` 负责从 route、trace、task/result、审计层面解释 `/chain` 背后的执行过程。

### 6.3 与市场化中台的关系

- 市场化中台负责内容路由、用户分层、推送分发、投放管理；
- `ops-ui` 负责为其提供治理能力、分发证据链和审计追踪。

### 6.4 与董事会总览台的关系

- 董事会总览台负责六部长 Agent 的跨部门管理视角；
- `ops-ui` 负责提供治理底座和中台证据。

## 7. 当前限制

当前 `ops-ui` 仍有这些限制：

- 仍偏向“治理运维台”，还不是完整治理部工作台；
- 还没有审批待办区；
- 还没有董事会议案区；
- 还没有外部分发审计区；
- 还没有将 `/chain` 双交易工作流正式接入；
- 还没有形成研究中台、市场化中台、董事会总览台之间的联动入口。

## 8. 演进方向

### Phase 1

继续完善当前治理控制台：

- Trace 详情；
- Queue 深度视图；
- Strategy 审计；
- Archive 治理；
- `/chain` 联动入口。

### Phase 2

扩展治理部专属工作台能力：

- 重大事项待审批列表；
- 决策原因区；
- 风险与红线告警区；
- 审批票据与回滚入口。

### Phase 3

纳入公司中枢：

- 与市场化中台联动；
- 与董事会总览台联动；
- 与 HR / 市场部信号联动；
- 成为公司中枢的治理控制台主入口。

## 9. 一句话结论

`ops-ui` 当前虽然是从运维控制台起步，但它在新架构里的正式定位应是：

> 以治理部为主视角、承接 route/trace/audit/approval 的公司中枢治理控制台。
