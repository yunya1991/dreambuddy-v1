# Agent Standard Dev Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为全体 AGENT 落地一套可执行的标准研发协作工具链，产出主流程 SKILL、4 个子 SKILL、评论模板、监督规则与 GitHub Actions 自动检查草案。

**Architecture:** 先把规则源头固化为仓库内文档和模板，再用监督规则与 Python 校验脚本把流程结构化，最后将 GitHub Actions 接到 PR 入口上做 fail-closed 检查。现有 `dual-agent-conflict-gate` 保留，作为 `agent-dev-execution` 的开工前子门禁，而不是重写全部协作规则。

**Tech Stack:** Markdown, JSON, Python 3 standard library, GitHub Actions YAML, existing `AGENT协作工具`, `AGENT协作工具/docs`, and `docs/superpowers/templates` layout.

说明：本文档中的文件路径以“仓库相对路径”为准；历史遗留的绝对路径示例不再作为规范。

---

## Repository Layout Changes

**Create**
- `AGENT协作工具/SKILLS/agent-standard-dev-lifecycle/SKILL.md`
- `AGENT协作工具/SKILLS/agent-design-review/SKILL.md`
- `AGENT协作工具/SKILLS/agent-dev-execution/SKILL.md`
- `AGENT协作工具/SKILLS/agent-quality-test/SKILL.md`
- `AGENT协作工具/SKILLS/agent-collab-supervisor/SKILL.md`
- `AGENT协作工具/SKILLS/agent-collab-supervisor/rules.json`
- `AGENT协作工具/templates/pr-comment-started.md`
- `AGENT协作工具/templates/pr-comment-updated.md`
- `AGENT协作工具/templates/pr-comment-blocked.md`
- `AGENT协作工具/templates/pr-comment-done.md`
- `AGENT协作工具/templates/design-review-comment.md`
- `AGENT协作工具/templates/test-report-comment.md`
- `AGENT协作工具/github-actions/README.md`
- `AGENT协作工具/github-actions/check_agent_lifecycle.py`
- `AGENT协作工具/github-actions/tests/test_check_agent_lifecycle.py`
- `.github/workflows/agent-lifecycle-guard.yml`
- `.github/pull_request_template.md`

**Modify**
- `AGENT协作工具/README.md`
- `AGENT协作工具/docs/README.md`
- `AGENT协作工具/docs/agent-standard-dev-lifecycle-design.md`
- `AGENT协作工具/docs/agent-standard-dev-lifecycle-implementation-plan.md`
- `docs/superpowers/templates/agent-task-card.md`

---

## Execution Protocol

Before any task work begins, the assigned agent must:

1. Run `AGENT协作工具/SKILLS/dual-agent-conflict-gate/conflict_gate.py`
2. If the result is `SAFE` or `WARNING`, post a `STARTED` PR comment before editing files
3. If scope changes, post an `UPDATED` comment
4. If the task is blocked, post a `BLOCKED` comment
5. After commit/push, post a `DONE` comment with commit SHA

Required status tags:

- `STARTED`
- `UPDATED`
- `BLOCKED`
- `DONE`

This protocol is mandatory for every task in this implementation plan because the work touches shared collaboration docs, shared templates, GitHub workflow files, and cross-agent standards.

## Execution Mode Update

The lifecycle remains fail-closed, but the default execution strategy should move from serialized handoff to controlled parallelism.

Recommended defaults:

- owner directories run in parallel after a valid `STARTED`
- small, deterministic fixes may use direct takeover with a follow-up broadcast
- sync points are reserved for shared files, frozen contracts, boundary changes, and milestone or `main` merges
- review happens per stage package instead of every micro-commit

Reference document:

- `AGENT协作工具/docs/agent-efficient-collaboration-mode.md`

---

### Task 1: Expand the collaboration entrypoints

**Files:**
- Modify: `AGENT协作工具/README.md`
- Modify: `docs/superpowers/templates/agent-task-card.md`

- [ ] **Step 1: Update the main collaboration README with the lifecycle stack**

Insert the following sections after `## 目录结构` in `AGENT协作工具/README.md`:

```md
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
```

- [ ] **Step 2: Extend the task card template with lifecycle evidence fields**

Replace the existing template content in `docs/superpowers/templates/agent-task-card.md` with:

```md
# Agent Task Card Template

## Basic Info
- Task Name:
- Owner:
- Reviewer:
- Milestone:
- Priority:
- Execution Mode: STANDARD | PHASE_BROADCAST | STRONG_SYNC
- Direct Takeover: no | allowed | active

## Goal
- What this task must achieve:

## Input Dependencies
- Required files:
- Required contracts:
- Required branches:

## Output Artifacts
- Files to create:
- Files to modify:
- Evidence to attach:

## Protected Boundaries
- Owner directories:
- Files not to modify:
- Contracts not to change:
- Shared files requiring approval:
- Sync required when:
- Next sync checkpoint:

## Lifecycle Evidence
- Design review record:
- Implementation plan:
- Test report:
- Supervision result:

## Conflict Check Record
- Gate result (SAFE / WARNING / BLOCK):
- reason_codes:
- Shared boundary touched: yes | no
- Takeover allowlist item:
- Checked at:

## Definition of Done
- [ ] Design reviewed
- [ ] Plan written
- [ ] Local change complete
- [ ] Tests attached
- [ ] Non-owner review attached
- [ ] Shared boundary declaration attached when needed
- [ ] Supervision passed
- [ ] Ready for milestone merge
```

- [ ] **Step 3: Verify both docs include lifecycle terminology**

Run:

```bash
grep -n "agent-standard-dev-lifecycle\\|Phase 0\\|Phase 8" AGENT协作工具/README.md
grep -n "Lifecycle Evidence\\|Supervision passed" docs/superpowers/templates/agent-task-card.md
```

Expected:

```text
README.md contains the lifecycle stack and Phase 0-8 lines
agent-task-card.md contains "## Lifecycle Evidence" and "Supervision passed"
```

- [ ] **Step 4: Commit the entrypoint updates**

```bash
git add AGENT协作工具/README.md docs/superpowers/templates/agent-task-card.md
git commit -m "docs(collaboration): expand lifecycle entrypoints"
```

---

### Task 2: Add reusable PR and review templates

**Files:**
- Create: `AGENT协作工具/templates/pr-comment-started.md`
- Create: `AGENT协作工具/templates/pr-comment-updated.md`
- Create: `AGENT协作工具/templates/pr-comment-blocked.md`
- Create: `AGENT协作工具/templates/pr-comment-done.md`
- Create: `AGENT协作工具/templates/design-review-comment.md`
- Create: `AGENT协作工具/templates/test-report-comment.md`

- [ ] **Step 1: Create the `STARTED` and `UPDATED` templates**

Create `pr-comment-started.md`:

```md
[协作开工声明 / STARTED]

Agent: <owner_agent>
任务: <task_name>
分支: <agent/* branch>
Execution Mode: <STANDARD | PHASE_BROADCAST | STRONG_SYNC>
Direct Takeover: <no | allowed | active>
计划修改:
- <path 1>
- <path 2>

预期产出:
- <artifact 1>
- <artifact 2>

占用范围:
- <shared path 1>

同步触发条件:
- <shared boundary / frozen contract / milestone closeout>

下一同步点:
- <design package / implementation package / closeout>

冲突门禁结果:
- decision: SAFE | WARNING
- reason_codes: <[] or codes>

状态: STARTED
说明:
- owner 目录内默认并行推进
- 仅在范围变化、真实阻塞或阶段收口时补充评论
```

Create `pr-comment-updated.md`:

```md
[协作状态更新 / UPDATED]

Agent: <owner_agent>
任务: <task_name>
Execution Mode: <STANDARD | PHASE_BROADCAST | STRONG_SYNC>
Direct Takeover: <no | allowed | active>
变更说明:
- <expanded scope or reduced scope>

当前占用范围:
- <shared path 1>

阶段:
- <Phase N>

下一同步点:
- <shared boundary review / test package / merge closeout>

状态: UPDATED
```

- [ ] **Step 2: Create the `BLOCKED` and `DONE` templates**

Create `pr-comment-blocked.md`:

```md
[协作阻塞通知 / BLOCKED]

Agent: <owner_agent>
任务: <task_name>
Execution Mode: <STANDARD | PHASE_BROADCAST | STRONG_SYNC>
Direct Takeover Requested: <yes | no>
阻塞原因:
- <blocking condition>

需要对方配合:
- <requested action>

建议下一模式:
- <direct takeover / strong sync / wait owner>

状态: BLOCKED
```

Create `pr-comment-done.md`:

```md
[协作完成回报 / DONE]

Agent: <owner_agent>
任务: <task_name>
Execution Mode: <STANDARD | PHASE_BROADCAST | STRONG_SYNC>
Direct Takeover: <no | allowed | active>
提交: <commit sha>
已完成:
- <completed item 1>
- <completed item 2>

下一步建议:
- <next reviewer / next owner / closeout action>

状态: DONE
说明: 另一代理可以基于最新 PR head 继续。
```

- [ ] **Step 3: Create the structured `DESIGN_REVIEW` and `TEST_REPORT` templates**

Create `design-review-comment.md`:

```md
[方案评审记录 / DESIGN_REVIEW]

Reviewer: <reviewer_agent>
Scope:
- <what is in scope>
- <what is out of scope>

Risks:
- <risk 1>
- <risk 2>

Decision: APPROVED | CHANGES_REQUESTED | REJECTED
Notes:
- <review note 1>
- <review note 2>
```

Create `test-report-comment.md`:

```md
[测试报告 / TEST_REPORT]

Tester: <owner_agent or tester_agent>
Unit:
- PASS | FAIL

Integration:
- PASS | FAIL

Scenario Simulation:
- normal path
- edge input
- invalid input
- upstream failure

Stress:
- PASS | FAIL | WAIVED

Decision: TEST_PASS | TEST_FAIL | RISK_ACCEPTED
Evidence:
- <command output or artifact path>
```

- [ ] **Step 4: Verify all template files exist**

Run:

```bash
find /Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/templates -maxdepth 1 -type f | sort
```

Expected:

```text
.../design-review-comment.md
.../pr-comment-blocked.md
.../pr-comment-done.md
.../pr-comment-started.md
.../pr-comment-updated.md
.../test-report-comment.md
```

- [ ] **Step 5: Commit the templates**

```bash
git add AGENT协作工具/templates
git commit -m "docs(collaboration): add lifecycle comment templates"
```

---

### Task 3: Create the master SKILL and four sub-skill docs

**Files:**
- Create: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/SKILLS/agent-standard-dev-lifecycle/SKILL.md`
- Create: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/SKILLS/agent-design-review/SKILL.md`
- Create: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/SKILLS/agent-dev-execution/SKILL.md`
- Create: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/SKILLS/agent-quality-test/SKILL.md`
- Create: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/SKILLS/agent-collab-supervisor/SKILL.md`

- [ ] **Step 1: Create the master lifecycle SKILL**

Create `agent-standard-dev-lifecycle/SKILL.md`:

```md
---
name: agent-standard-dev-lifecycle
description: 全 AGENT 通用的标准研发生命周期编排器。触发词：生命周期、开发流程、研发流程、implementation lifecycle、agent lifecycle
version: "1.0"
created: "2026-05-17"
status: "draft"
---

# Agent Standard Dev Lifecycle

## 目标

统一编排以下阶段：

1. Phase 0 任务登记
2. Phase 1 方案评审
3. Phase 2 实施计划
4. Phase 3 开工门禁
5. Phase 4 开发执行
6. Phase 5 测试验证
7. Phase 6 PR 评审
8. Phase 7 合入监督
9. Phase 8 完成归档

## 输入

- task card
- owner_agent
- target_pr
- target_branch
- files_in_scope
- contracts_depended

## 输出

- current_phase
- phase_result
- next_action
- missing_evidence
```

- [ ] **Step 2: Create the design review and dev execution SKILL docs**

Create `agent-design-review/SKILL.md`:

```md
---
name: agent-design-review
description: 方案评审 SKILL。检查范围、依赖、风险、非目标与实施前提。触发词：方案评审、设计评审、design review
version: "1.0"
created: "2026-05-17"
status: "draft"
---

# Agent Design Review

## 必查项

- scope is explicit
- non-goals are explicit
- dependencies are explicit
- risks are explicit
- interfaces are explicit

## 输出结论

- APPROVED
- CHANGES_REQUESTED
- REJECTED
```
Create `agent-dev-execution/SKILL.md`:

```md
---
name: agent-dev-execution
description: 开发执行 SKILL。强制接入 implementation plan、冲突门禁与 PR 评论协议。触发词：开发执行、开始开发、execute task
version: "1.0"
created: "2026-05-17"
status: "draft"
---

# Agent Dev Execution

## 必须顺序

1. read implementation plan
2. run dual-agent-conflict-gate
3. post STARTED
4. edit files
5. post UPDATED when scope changes
6. post BLOCKED when execution cannot continue
7. post DONE after commit and push
```

- [ ] **Step 3: Create the quality test and supervisor SKILL docs**

Create `agent-quality-test/SKILL.md`:

```md
---
name: agent-quality-test
description: 测试验证 SKILL。强制输出单测、集成、多场景模拟、压力测试结论。触发词：测试验证、质量测试、test report
version: "1.0"
created: "2026-05-17"
status: "draft"
---

# Agent Quality Test

## 测试矩阵

- unit
- integration
- scenario simulation
- stress or waiver

## 输出结论

- TEST_PASS
- TEST_FAIL
- RISK_ACCEPTED
```

Create `agent-collab-supervisor/SKILL.md`:

```md
---
name: agent-collab-supervisor
description: 协作监督 SKILL。核验任务卡、评审记录、评论协议、测试证据与分支合规性。触发词：流程监督、监督检查、collab supervisor
version: "1.0"
created: "2026-05-17"
status: "draft"
---

# Agent Collaboration Supervisor

## 监督目标

- verify task card exists
- verify design review exists
- verify STARTED and DONE comments exist
- verify non-owner review exists
- verify test evidence exists
- verify branch policy is respected

## 输出结论

- SUPERVISION_PASS
- SUPERVISION_REWORK
- SUPERVISION_BLOCK
```

- [ ] **Step 4: Verify every SKILL directory now has a `SKILL.md`**

Run:

```bash
find /Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/SKILLS -maxdepth 2 -name SKILL.md | sort
```

Expected:

```text
.../agent-collab-supervisor/SKILL.md
.../agent-design-review/SKILL.md
.../agent-dev-execution/SKILL.md
.../agent-quality-test/SKILL.md
.../agent-standard-dev-lifecycle/SKILL.md
.../dual-agent-conflict-gate/SKILL.md
```

- [ ] **Step 5: Commit the SKILL docs**

```bash
git add AGENT协作工具/SKILLS/agent-standard-dev-lifecycle AGENT协作工具/SKILLS/agent-design-review AGENT协作工具/SKILLS/agent-dev-execution AGENT协作工具/SKILLS/agent-quality-test AGENT协作工具/SKILLS/agent-collab-supervisor
git commit -m "docs(collaboration): add lifecycle skill docs"
```

---

### Task 4: Add the supervisor rule catalog

**Files:**
- Create: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/SKILLS/agent-collab-supervisor/rules.json`

- [ ] **Step 1: Create the rule catalog JSON**

Create `rules.json`:

```json
{
  "version": "1.0",
  "rules": [
    {
      "id": "RULE_001_TASK_CARD_REQUIRED",
      "severity": "block",
      "check": "task_card_present"
    },
    {
      "id": "RULE_002_DESIGN_REVIEW_REQUIRED",
      "severity": "block",
      "check": "design_review_present"
    },
    {
      "id": "RULE_003_STARTED_REQUIRED",
      "severity": "block",
      "check": "started_comment_present"
    },
    {
      "id": "RULE_004_SCOPE_CHANGE_MUST_UPDATE",
      "severity": "block",
      "check": "updated_comment_present_when_scope_changes"
    },
    {
      "id": "RULE_005_BLOCK_MUST_ANNOUNCE",
      "severity": "block",
      "check": "blocked_comment_present_when_execution_blocked"
    },
    {
      "id": "RULE_006_TEST_EVIDENCE_REQUIRED",
      "severity": "block",
      "check": "test_report_present"
    },
    {
      "id": "RULE_007_REVIEW_BY_NON_OWNER",
      "severity": "block",
      "check": "non_owner_review_present"
    },
    {
      "id": "RULE_008_DONE_REQUIRED",
      "severity": "block",
      "check": "done_comment_present"
    },
    {
      "id": "RULE_009_BRANCH_POLICY_ENFORCED",
      "severity": "block",
      "check": "branch_policy_valid"
    },
    {
      "id": "RULE_010_SHARED_FILE_DECLARATION",
      "severity": "block",
      "check": "shared_files_declared"
    }
  ]
}
```

- [ ] **Step 2: Validate the JSON file**

Run:

```bash
python3 -m json.tool /Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/SKILLS/agent-collab-supervisor/rules.json >/dev/null
```

Expected: no output and exit code `0`.

- [ ] **Step 3: Commit the rule catalog**

```bash
git add AGENT协作工具/SKILLS/agent-collab-supervisor/rules.json
git commit -m "docs(collaboration): add supervisor rule catalog"
```

---

### Task 5: Implement and test the lifecycle checker script

**Files:**
- Create: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/github-actions/check_agent_lifecycle.py`
- Create: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/github-actions/tests/test_check_agent_lifecycle.py`
- Create: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/github-actions/README.md`

- [ ] **Step 1: Write the failing tests first**

Create `test_check_agent_lifecycle.py`:

```python
import importlib.util
import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "check_agent_lifecycle.py"
SPEC = importlib.util.spec_from_file_location("check_agent_lifecycle", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class LifecycleCheckerTests(unittest.TestCase):
    def test_pass_when_all_required_evidence_exists(self):
        payload = {
            "branch": "agent/solo/lifecycle-docs",
            "owner_agent": "SOLO",
            "shared_files_declared": True,
            "task_card_present": True,
            "design_review_present": True,
            "test_report_present": True,
            "non_owner_review_present": True,
            "scope_changed": False,
            "execution_blocked": False,
            "comments": ["STARTED", "DONE"]
        }
        result = MODULE.evaluate_payload(payload)
        self.assertEqual(result["decision"], "PASS")
        self.assertEqual(result["reason_codes"], [])

    def test_block_when_started_comment_is_missing(self):
        payload = {
            "branch": "agent/solo/lifecycle-docs",
            "owner_agent": "SOLO",
            "shared_files_declared": True,
            "task_card_present": True,
            "design_review_present": True,
            "test_report_present": True,
            "non_owner_review_present": True,
            "scope_changed": False,
            "execution_blocked": False,
            "comments": ["DONE"]
        }
        result = MODULE.evaluate_payload(payload)
        self.assertEqual(result["decision"], "BLOCK")
        self.assertIn("RULE_003_STARTED_REQUIRED", result["reason_codes"])

    def test_block_when_branch_policy_is_invalid(self):
        payload = {
            "branch": "main",
            "owner_agent": "SOLO",
            "shared_files_declared": True,
            "task_card_present": True,
            "design_review_present": True,
            "test_report_present": True,
            "non_owner_review_present": True,
            "scope_changed": False,
            "execution_blocked": False,
            "comments": ["STARTED", "DONE"]
        }
        result = MODULE.evaluate_payload(payload)
        self.assertEqual(result["decision"], "BLOCK")
        self.assertIn("RULE_009_BRANCH_POLICY_ENFORCED", result["reason_codes"])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
python3 -m unittest discover -s "/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/github-actions/tests" -p "test_*.py"
```

Expected: `FAILED` because `check_agent_lifecycle.py` does not exist yet.

- [ ] **Step 3: Write the minimal lifecycle checker implementation**

Create `check_agent_lifecycle.py`:

```python
import json
import sys
from pathlib import Path


RULES_PATH = Path(__file__).resolve().parents[1] / "SKILLS" / "agent-collab-supervisor" / "rules.json"


def load_rules():
    with RULES_PATH.open("r", encoding="utf-8") as fh:
        return json.load(fh)["rules"]


def branch_policy_valid(branch):
    return branch.startswith("agent/") or branch.startswith("milestone/")


def evaluate_payload(payload):
    rules = load_rules()
    reason_codes = []

    comments = payload.get("comments", [])
    if not payload.get("task_card_present"):
        reason_codes.append("RULE_001_TASK_CARD_REQUIRED")
    if not payload.get("design_review_present"):
        reason_codes.append("RULE_002_DESIGN_REVIEW_REQUIRED")
    if "STARTED" not in comments:
        reason_codes.append("RULE_003_STARTED_REQUIRED")
    if payload.get("scope_changed") and "UPDATED" not in comments:
        reason_codes.append("RULE_004_SCOPE_CHANGE_MUST_UPDATE")
    if payload.get("execution_blocked") and "BLOCKED" not in comments:
        reason_codes.append("RULE_005_BLOCK_MUST_ANNOUNCE")
    if not payload.get("test_report_present"):
        reason_codes.append("RULE_006_TEST_EVIDENCE_REQUIRED")
    if not payload.get("non_owner_review_present"):
        reason_codes.append("RULE_007_REVIEW_BY_NON_OWNER")
    if "DONE" not in comments:
        reason_codes.append("RULE_008_DONE_REQUIRED")
    if not branch_policy_valid(payload.get("branch", "")):
        reason_codes.append("RULE_009_BRANCH_POLICY_ENFORCED")
    if not payload.get("shared_files_declared"):
        reason_codes.append("RULE_010_SHARED_FILE_DECLARATION")

    return {
        "decision": "PASS" if not reason_codes else "BLOCK",
        "reason_codes": reason_codes,
        "evaluated_rule_count": len(rules)
    }


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: check_agent_lifecycle.py <payload.json>")

    payload_path = Path(sys.argv[1])
    with payload_path.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)

    result = evaluate_payload(payload)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(0 if result["decision"] == "PASS" else 1)


if __name__ == "__main__":
    main()
```

Create `AGENT协作工具/github-actions/README.md`:

```md
# Agent Lifecycle Guard

本目录存放 GitHub Actions 侧使用的校验脚本与说明。

## 当前脚本

- `check_agent_lifecycle.py`：根据 PR 事件载荷检查任务卡、评审、评论、测试与分支规则是否齐全

## 输入载荷字段

- `branch`
- `owner_agent`
- `shared_files_declared`
- `task_card_present`
- `design_review_present`
- `test_report_present`
- `non_owner_review_present`
- `scope_changed`
- `execution_blocked`
- `comments`
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
python3 -m unittest discover -s "/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/github-actions/tests" -p "test_*.py"
```

Expected:

```text
...
----------------------------------------------------------------------
Ran 3 tests in <small number>s

OK
```

- [ ] **Step 5: Commit the checker implementation**

```bash
git add AGENT协作工具/github-actions
git commit -m "feat(collaboration): add lifecycle checker script"
```

---

### Task 6: Wire the GitHub Action and PR template

**Files:**
- Create: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/.github/workflows/agent-lifecycle-guard.yml`
- Create: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/.github/pull_request_template.md`

- [ ] **Step 1: Create the PR template used by the checker**

Create `.github/pull_request_template.md`:

```md
## Task Card
- [ ] 已附任务卡链接或正文

## Design Review
- [ ] 已附 `DESIGN_REVIEW` 评论链接

## Implementation Plan
- [ ] 已附 implementation plan 链接

## Test Report
- [ ] 已附 `TEST_REPORT` 评论链接或测试证据

## Collaboration Protocol
- [ ] 已发 `STARTED`
- [ ] 范围变化时已发 `UPDATED`
- [ ] 阻塞时已发 `BLOCKED`
- [ ] 完成后将发 `DONE`
- [ ] 仅在关键节点广播，不为每个微小提交重复评论

## Owner Agent
- [ ] 已填写主责 AGENT
```

- [ ] **Step 2: Create the first version of the lifecycle guard workflow**

Create `.github/workflows/agent-lifecycle-guard.yml`:

```yaml
name: Agent Lifecycle Guard

on:
  pull_request:
    types: [opened, edited, synchronize, reopened, ready_for_review]
  issue_comment:
    types: [created, edited]

permissions:
  contents: read
  issues: read
  pull-requests: read

jobs:
  lifecycle-guard:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Build lifecycle payload
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const payload = context.payload;
            const issueNumber = payload.pull_request?.number || payload.issue?.number;
            let pr = payload.pull_request;
            if (!pr && payload.issue?.pull_request && issueNumber) {
              const prResponse = await github.rest.pulls.get({
                owner: context.repo.owner,
                repo: context.repo.repo,
                pull_number: issueNumber
              });
              pr = prResponse.data;
            }

            const comments = [];
            if (issueNumber) {
              const issueComments = await github.paginate(
                github.rest.issues.listComments,
                {
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  issue_number: issueNumber
                }
              );
              for (const comment of issueComments) {
                if (comment.body.includes("STARTED")) comments.push("STARTED");
                if (comment.body.includes("UPDATED")) comments.push("UPDATED");
                if (comment.body.includes("BLOCKED")) comments.push("BLOCKED");
                if (comment.body.includes("DONE")) comments.push("DONE");
                if (comment.body.includes("DESIGN_REVIEW")) comments.push("DESIGN_REVIEW");
                if (comment.body.includes("TEST_REPORT")) comments.push("TEST_REPORT");
              }
            }

            let reviewCount = 0;
            if (issueNumber) {
              const reviews = await github.paginate(
                github.rest.pulls.listReviews,
                {
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  pull_number: issueNumber
                }
              );
              reviewCount = reviews.length;
            }

            const prBody = pr?.body || "";
            const result = {
              branch: String(pr?.head?.ref || ""),
              owner_agent: "UNKNOWN",
              shared_files_declared: true,
              task_card_present: prBody.includes("Task Card"),
              design_review_present: comments.includes("DESIGN_REVIEW"),
              test_report_present: comments.includes("TEST_REPORT"),
              non_owner_review_present: reviewCount > 0,
              scope_changed: false,
              execution_blocked: false,
              comments
            };
            fs.writeFileSync("agent_lifecycle_payload.json", JSON.stringify(result, null, 2));

      - name: Run lifecycle checker
        run: python3 "AGENT协作工具/github-actions/check_agent_lifecycle.py" agent_lifecycle_payload.json
```

- [ ] **Step 3: Validate the workflow YAML**

Run:

```bash
ruby -e 'require "yaml"; YAML.load_file("/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/.github/workflows/agent-lifecycle-guard.yml"); puts "workflow yaml ok"'
```

Expected:

```text
workflow yaml ok
```

- [ ] **Step 4: Commit the workflow and PR template**

```bash
git add .github/pull_request_template.md .github/workflows/agent-lifecycle-guard.yml
git commit -m "ci(collaboration): add lifecycle guard workflow"
```

---

## Rollout Notes

### Phase A
- 固化规则文档、模板与 SKILL 文档
- 让人和 AGENT 先按统一格式协作

### Phase B
- 上线监督规则与 Python 检查脚本
- 在本地和 PR 中验证规则行为

### Phase C
- 接入 GitHub Actions
- 把 PR 检查从“口头约束”变成“自动阻断”

## Spec Coverage Check

- `1 个主流程 + 4 个子 SKILL`：由 Task 3 覆盖
- 评论协议与结构化互评：由 Task 2 覆盖
- 测试与监督规则：由 Task 4、Task 5 覆盖
- GitHub Actions 接入草案：由 Task 6 覆盖
- 与现有工具链衔接：由 Task 1、Task 3 覆盖
