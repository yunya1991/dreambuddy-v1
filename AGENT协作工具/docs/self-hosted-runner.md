# Self-Hosted Runner 自动化（试点：PR9）

本文件描述一种“无人工点击运行”的自动化形态：使用 GitHub Actions 的 `schedule` 触发，但在自托管 `macOS` runner 上执行 `7-ARTIFACT-HUB-V2` 的 build/test，并把结果以结构化 PR 评论写回，最终由现有的账本闭环工作流推进 `tasks/index.json` 与 `rewards/index.json`。

## 目标

- 解决定时自动化任务需要人工点运行/授权导致链条卡死的问题
- 保持协作协议落脚点不变：PR 结构化评论 + 仓库内 JSON 账本
- 使用本机工具链（Node/Python/gh），让 build/test 在真实环境上可重复

## Runner 标签约定

试点 PR9 的三个自动化工作流使用以下 runner labels：

- `self-hosted`
- `macOS`
- `workbuddy`

## 一次性安装/注册（手工步骤）

1. 在仓库 Settings → Actions → Runners 新增 self-hosted runner
2. 选择 macOS，按 GitHub 提示下载并配置 runner
3. 为 runner 增加 labels：`macOS`、`workbuddy`
4. 保证 runner 常驻运行（建议作为系统服务或登录项）

## 依赖要求

- `gh`（GitHub CLI）
- `node` + `npm`（版本以 `7-ARTIFACT-HUB-V2/package.json` 为准）
- `python3`（用于仓库内既有 github-actions 脚本与测试）

## 安全边界

- workflow 仅使用 `${{ github.token }}`（不要求交互式授权）
- workflow 默认只需要 `contents: read` 与 `issues: write`
- workflow 不自动提交代码、不直接写账本
- 账本写回仍由 `agent-collaboration-claim-guard.yml` 统一执行

## 工作流清单（试点：PR9）

- `.github/workflows/pr9-developer-agent.yml`
  - 定时跑 build/test，输出 `[测试报告 / TEST_REPORT]`
  - 若缺失，会补一个 `[协作开工声明 / STARTED]` 作为 task_id 锚点
- `.github/workflows/pr9-validator-agent.yml`
  - 定时复跑 build/test
  - PASS 时输出 `[验证结论 / VALIDATION_RESULT]` 且 `Governance Handoff: ledgered`，用于触发账本推进与奖励写回
- `.github/workflows/pr9-governance-agent.yml`
  - 定时检查协议锚点完整性（STARTED/TEST_REPORT/VALIDATION_RESULT）
  - 缺失则输出 `[协作状态更新 / UPDATED]`，明确下一步需要谁补什么

## 验收清单

- 三个 workflow 都能在 GitHub Actions 中按计划自动触发（无需人工点运行）
- 试点 PR 会持续出现结构化评论（STARTED/TEST_REPORT/VALIDATION_RESULT）
- 当 validator 输出 `Decision: ACCEPTED` + `Governance Handoff: ledgered` 时：
  - `agent-collaboration-claim-guard` 会触发并推进 `tasks/index.json` 中目标任务到 `ledgered`
  - `rewards/index.json` 会新增对应奖励记录（仅在状态实际变化且有 score 时写入）
