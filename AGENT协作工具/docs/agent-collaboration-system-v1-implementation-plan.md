# Agent Collaboration System V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `AGENT协作系统 v1` 落地 GitHub 原生账本、探索提案、声明裁决、交付证明、验证评分与治理积分的最小可执行闭环。

**Architecture:** 先把账本对象、模板和规则源固化为仓库文件，再通过 Python 脚本和 GitHub Actions 把声明裁决、评分记账和自动调度串起来，最后将现有 `conflict_gate`、checker、任务卡与评论模板并入统一账本协议。`v1` 保持 GitHub 原生，不引入独立数据库或外部服务。

**Tech Stack:** Markdown, JSON, YAML, Python 3 standard library, GitHub Actions, existing `AGENT协作工具` docs/templates/github-actions layout.

说明：本文档中的文件路径以“仓库相对路径”为准；历史遗留的绝对路径示例不再作为规范。

---

## Repository Layout Changes

**Create**
- `AGENT协作工具/ledger/README.md`
- `AGENT协作工具/ledger/tasks/index.json`
- `AGENT协作工具/ledger/rewards/index.json`
- `AGENT协作工具/ledger/templates/task-record.json`
- `AGENT协作工具/ledger/templates/reward-record.json`
- `AGENT协作工具/templates/pr-comment-exploration-proposal.md`
- `AGENT协作工具/templates/pr-comment-validation-result.md`
- `AGENT协作工具/templates/pr-comment-ledger-entry.md`
- `AGENT协作工具/github-actions/build_agent_collaboration_payload.py`
- `AGENT协作工具/github-actions/check_agent_collaboration.py`
- `AGENT协作工具/github-actions/update_agent_ledger.py`
- `AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py`
- `AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py`
- `AGENT协作工具/github-actions/tests/test_update_agent_ledger.py`
- `.github/workflows/agent-collaboration-claim-guard.yml`
- `.github/workflows/agent-ledger-maintenance.yml`

**Modify**
- `AGENT协作工具/README.md`
- `AGENT协作工具/docs/README.md`
- `AGENT协作工具/docs/agent-collaboration-system-v1-design.md`
- `AGENT协作工具/docs/agent-collaboration-system-v1-implementation-plan.md`
- `AGENT协作工具/templates/pr-comment-started.md`
- `AGENT协作工具/templates/pr-comment-updated.md`
- `AGENT协作工具/templates/pr-comment-done.md`
- `AGENT协作工具/templates/test-report-comment.md`
- `docs/superpowers/templates/agent-task-card.md`
- `AGENT协作工具/SKILLS/dual-agent-conflict-gate/gatekeeper_config.json`
- `AGENT协作工具/SKILLS/dual-agent-conflict-gate/conflict_gate.py`
- `AGENT协作工具/SKILLS/dual-agent-conflict-gate/test_conflict_gate.py`
- `.github/pull_request_template.md`

---

## Execution Protocol

Before any task work begins, the assigned agent must:

1. Read `AGENT协作工具/ledger/tasks/index.json`
2. If a ready task exists, follow the normal claim flow
3. If no ready task exists, create an exploration proposal comment first and wait for validator approval
4. Run `AGENT协作工具/SKILLS/dual-agent-conflict-gate/conflict_gate.py`
5. If the result is `SAFE` or `WARNING`, post a `STARTED` comment before editing files
6. If scope changes, post an `UPDATED` comment
7. If blocked, post a `BLOCKED` comment
8. After delivery, post a delivery comment plus `TEST_REPORT`
9. The validator agent posts the validation result and ledger entry comment

Mandatory structured comment set for `v1`:

- `EXPLORATION_PROPOSAL`
- `STARTED`
- `UPDATED`
- `BLOCKED`
- `TEST_REPORT`
- `VALIDATION_RESULT`
- `LEDGER_ENTRY`
- `DONE`

This protocol is mandatory because the work touches shared collaboration rules, GitHub workflows, ledger files, validator responsibilities, and reward calculation logic.

---

## Implementation Sequence

The implementation should be delivered in six slices:

1. Ledger structure and source-of-truth files
2. Proposal/claim/delivery/validation comment templates
3. Collaboration payload builder and rule checker
4. Ledger updater and reward calculation
5. Workflow integration and scheduled maintenance
6. Migration docs, task-card alignment, and validator-only ownership of technical review

---

### Task 1: Create the ledger file structure

**Files:**
- Create: `AGENT协作工具/ledger/README.md`
- Create: `AGENT协作工具/ledger/tasks/index.json`
- Create: `AGENT协作工具/ledger/rewards/index.json`
- Create: `AGENT协作工具/ledger/templates/task-record.json`
- Create: `AGENT协作工具/ledger/templates/reward-record.json`

- [ ] **Step 1: Add a failing JSON shape test for the task ledger skeleton**

Create `AGENT协作工具/github-actions/tests/test_update_agent_ledger.py` with:

```python
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class LedgerSeedShapeTests(unittest.TestCase):
    def test_task_index_has_required_top_level_keys(self):
        data = json.loads(
            (ROOT / "ledger" / "tasks" / "index.json").read_text(encoding="utf-8")
        )
        self.assertEqual(
            sorted(data.keys()),
            ["generated_at", "open_tasks", "tasks", "version"],
        )


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
```

Expected:

- FAIL because `index.json` does not exist yet

- [ ] **Step 3: Create the initial ledger files**

Create `AGENT协作工具/ledger/tasks/index.json`:

```json
{
  "version": 1,
  "generated_at": "1970-01-01T00:00:00Z",
  "open_tasks": [],
  "tasks": []
}
```

Create `AGENT协作工具/ledger/rewards/index.json`:

```json
{
  "version": 1,
  "generated_at": "1970-01-01T00:00:00Z",
  "reward_records": []
}
```

Create `AGENT协作工具/ledger/templates/task-record.json`:

```json
{
  "task_id": "task-example",
  "title": "Example task",
  "source_type": "assigned",
  "task_type": "parallel",
  "mode": "PHASE_BROADCAST",
  "status": "open",
  "owner_agent": "",
  "validator_agent": "",
  "exclusive_owner_agent": "",
  "exclusive_until": "",
  "branch": "",
  "workspace_path": "",
  "claim_pointer": "",
  "delivery_pointer": "",
  "score": null,
  "reward": null,
  "final_credit_agent": ""
}
```

Create `AGENT协作工具/ledger/templates/reward-record.json`:

```json
{
  "task_id": "task-example",
  "reward_type": "effective_delivery",
  "base_reward": 10,
  "quality_multiplier": 1.0,
  "final_reward": 10,
  "credited_agent": "SOLO",
  "credited_at": "1970-01-01T00:00:00Z"
}
```

Create `AGENT协作工具/ledger/README.md`:

```md
# AGENT 协作账本

本目录是 `AGENT协作系统 v1` 的账本真源。

- `tasks/index.json`：任务总账本
- `rewards/index.json`：奖励总账本
- `templates/*.json`：账本对象模板

规则：

1. 所有正式任务必须先入账再执行
2. 账本状态高于评论状态
3. 奖励结算必须由验证者 AGENT 触发
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add AGENT协作工具/ledger AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
git commit -m "feat(collaboration): add ledger seed files"
```

### Task 2: Add exploration, validation, and ledger templates

**Files:**
- Create: `AGENT协作工具/templates/pr-comment-exploration-proposal.md`
- Create: `AGENT协作工具/templates/pr-comment-validation-result.md`
- Create: `AGENT协作工具/templates/pr-comment-ledger-entry.md`
- Modify: `AGENT协作工具/templates/pr-comment-started.md`
- Modify: `AGENT协作工具/templates/pr-comment-done.md`
- Modify: `AGENT协作工具/templates/test-report-comment.md`
- Modify: `docs/superpowers/templates/agent-task-card.md`

- [ ] **Step 1: Write a failing template presence test**

Append to `AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py`:

```python
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]


class TemplatePresenceTests(unittest.TestCase):
    def test_required_collaboration_templates_exist(self):
        required = [
            "templates/pr-comment-exploration-proposal.md",
            "templates/pr-comment-validation-result.md",
            "templates/pr-comment-ledger-entry.md",
        ]
        for rel in required:
            self.assertTrue((ROOT / rel).exists(), rel)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py
```

Expected:

- FAIL because the new templates do not exist

- [ ] **Step 3: Create the new templates and extend existing ones**

Create `AGENT协作工具/templates/pr-comment-exploration-proposal.md`:

```md
[探索提案 / EXPLORATION_PROPOSAL]

Agent: <agent>
Proposal Type: <bugfix | hardening | drift-fix | tooling>
Necessity:
- <why this matters now>
Value:
- <user/system value>
Scope Boundaries:
- <files or directories>
Risk Notes:
- <shared boundary impact>
Expected Deliverable:
- <artifact or outcome>
Requested Exclusive Window: <ISO8601 duration or deadline>
Status: EXPLORATION_PROPOSAL
```

Create `AGENT协作工具/templates/pr-comment-validation-result.md`:

```md
[验证结论 / VALIDATION_RESULT]

Validator: <validator agent>
Hard Gate Result: <PASS | BLOCK>
Score: <0-100>
Decision: <ACCEPTED | REWORK | BLOCK>
Reason Codes:
- <code>
Reward Multiplier: <value>
Ledger Update: <task pointer or none>
```

Create `AGENT协作工具/templates/pr-comment-ledger-entry.md`:

```md
[账本记账 / LEDGER_ENTRY]

Validator: <validator agent>
Task ID: <task_id>
Accepted Delivery Pointer: <pointer>
Reward Result: <value>
Final Credit Agent: <agent>
Ledger Entry Path: <path>
```

Update `AGENT协作工具/templates/pr-comment-started.md` by inserting:

```md
Task ID: <task_id>
Workspace Path: <path>
Claim Target: <task id or proposal>
```

Update `AGENT协作工具/templates/pr-comment-done.md` by inserting:

```md
Parent Pointer: <pointer>
Delivery Hash: <hash>
```

Update `AGENT协作工具/templates/test-report-comment.md` by inserting:

```md
Task ID: <task_id>
Scenario Evidence:
- <scenario evidence>
```

Update `docs/superpowers/templates/agent-task-card.md` by adding:

```md
## Ledger Binding
- Task ID:
- Source Type: assigned | derived | exploratory
- Validator Agent:
- Exclusive Window:
- Claim Pointer:
- Delivery Pointer:
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add AGENT协作工具/templates docs/superpowers/templates/agent-task-card.md AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py
git commit -m "feat(collaboration): add proposal and ledger templates"
```

### Task 3: Build the collaboration payload parser

**Files:**
- Create: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/github-actions/build_agent_collaboration_payload.py`
- Modify: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py`

- [ ] **Step 1: Write the failing parser test**

Add:

```python
import importlib.util
from pathlib import Path


MODULE_PATH = (
    Path(__file__).resolve().parents[1] / "build_agent_collaboration_payload.py"
)
SPEC = importlib.util.spec_from_file_location("build_agent_collaboration_payload", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class CollaborationPayloadTests(unittest.TestCase):
    def test_extracts_exploration_and_validation_signals(self):
        raw = {
            "branch": "agent/solo/ledger-v1",
            "pr_body": "## Owner Agent\nOwner Agent: SOLO\n",
            "comments": [
                "[探索提案 / EXPLORATION_PROPOSAL]\n\n"
                "Agent: SOLO\n"
                "Proposal Type: bugfix\n"
                "Necessity:\n- close gap\n"
                "Value:\n- remove blocker\n"
                "Scope Boundaries:\n- AGENT协作工具/ledger/\n"
                "Requested Exclusive Window: 2026-05-18T00:00:00Z\n"
                "Status: EXPLORATION_PROPOSAL\n",
                "[验证结论 / VALIDATION_RESULT]\n\n"
                "Validator: Claude Code\n"
                "Hard Gate Result: PASS\n"
                "Score: 88\n"
                "Decision: ACCEPTED\n"
                "Reward Multiplier: 1.2\n"
                "Ledger Update: AGENT协作工具/ledger/tasks/index.json\n",
            ],
        }
        payload = MODULE.build_payload(raw)
        self.assertTrue(payload["exploration_present"])
        self.assertEqual(payload["validation_decision"], "ACCEPTED")
        self.assertEqual(payload["validation_score"], 88)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py
```

Expected:

- FAIL because parser file and fields do not exist

- [ ] **Step 3: Write minimal parser implementation**

Create `AGENT协作工具/github-actions/build_agent_collaboration_payload.py` with:

```python
import json
import sys


def extract_field(text, field_name):
    prefix = f"{field_name}:"
    for line in text.splitlines():
        if line.startswith(prefix):
            return line[len(prefix):].strip()
    return ""


def build_payload(raw):
    comments = raw.get("comments", [])
    exploration_comments = [
        comment for comment in comments if comment.startswith("[探索提案 / EXPLORATION_PROPOSAL]")
    ]
    validation_comments = [
        comment for comment in comments if comment.startswith("[验证结论 / VALIDATION_RESULT]")
    ]
    latest_validation = validation_comments[-1] if validation_comments else ""
    score = extract_field(latest_validation, "Score")
    return {
        "branch": raw.get("branch", ""),
        "exploration_present": bool(exploration_comments),
        "validation_decision": extract_field(latest_validation, "Decision"),
        "validation_score": int(score) if score else None,
    }


if __name__ == "__main__":
    raw = json.load(sys.stdin)
    json.dump(build_payload(raw), sys.stdout, ensure_ascii=False, indent=2)
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add AGENT协作工具/github-actions/build_agent_collaboration_payload.py AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py
git commit -m "feat(collaboration): add collaboration payload parser"
```

### Task 4: Implement the collaboration checker

**Files:**
- Create: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/github-actions/check_agent_collaboration.py`
- Modify: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py`

- [ ] **Step 1: Write the failing checker test**

Create `AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py`:

```python
import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "check_agent_collaboration.py"
SPEC = importlib.util.spec_from_file_location("check_agent_collaboration", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class CollaborationCheckerTests(unittest.TestCase):
    def test_blocks_when_exploration_has_no_validation(self):
        payload = {
            "exploration_present": True,
            "validation_decision": "",
            "validation_score": None,
        }
        result = MODULE.evaluate_payload(payload)
        self.assertEqual(result["decision"], "BLOCK")
        self.assertIn("RULE_COLLAB_VALIDATION_REQUIRED", result["reason_codes"])
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py
```

Expected:

- FAIL because checker file does not exist

- [ ] **Step 3: Implement the minimal rule engine**

Create `AGENT协作工具/github-actions/check_agent_collaboration.py`:

```python
import json
import sys


def evaluate_payload(payload):
    reason_codes = []
    if payload.get("exploration_present") and not payload.get("validation_decision"):
        reason_codes.append("RULE_COLLAB_VALIDATION_REQUIRED")
    if payload.get("validation_score") is not None and payload["validation_score"] < 60:
        reason_codes.append("RULE_COLLAB_SCORE_TOO_LOW")

    decision = "PASS" if not reason_codes else "BLOCK"
    return {"decision": decision, "reason_codes": reason_codes}


if __name__ == "__main__":
    payload = json.load(sys.stdin)
    json.dump(evaluate_payload(payload), sys.stdout, ensure_ascii=False, indent=2)
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add AGENT协作工具/github-actions/check_agent_collaboration.py AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py
git commit -m "feat(collaboration): add collaboration checker"
```

### Task 5: Implement ledger update and reward calculation

**Files:**
- Create: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/github-actions/update_agent_ledger.py`
- Modify: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/github-actions/tests/test_update_agent_ledger.py`
- Modify: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/ledger/tasks/index.json`
- Modify: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/ledger/rewards/index.json`

- [ ] **Step 1: Add a failing reward calculation test**

Append:

```python
import importlib.util


MODULE_PATH = ROOT / "github-actions" / "update_agent_ledger.py"
SPEC = importlib.util.spec_from_file_location("update_agent_ledger", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class RewardCalculationTests(unittest.TestCase):
    def test_calculates_quality_weighted_reward(self):
        reward = MODULE.calculate_reward(base_reward=10, score=88)
        self.assertEqual(reward["quality_multiplier"], 1.0)
        self.assertEqual(reward["final_reward"], 10)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
```

Expected:

- FAIL because updater file does not exist

- [ ] **Step 3: Implement the minimal ledger updater**

Create `AGENT协作工具/github-actions/update_agent_ledger.py`:

```python
import json
from datetime import datetime, timezone


def quality_multiplier(score):
    if score >= 90:
        return 1.2
    if score >= 80:
        return 1.0
    return 0.0


def calculate_reward(base_reward, score):
    multiplier = quality_multiplier(score)
    return {
        "quality_multiplier": multiplier,
        "final_reward": int(base_reward * multiplier),
    }


def utc_now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def append_reward_record(reward_index, record):
    reward_index["generated_at"] = utc_now()
    reward_index["reward_records"].append(record)
    return reward_index
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add AGENT协作工具/github-actions/update_agent_ledger.py AGENT协作工具/github-actions/tests/test_update_agent_ledger.py AGENT协作工具/ledger/tasks/index.json AGENT协作工具/ledger/rewards/index.json
git commit -m "feat(collaboration): add ledger reward updater"
```

### Task 6: Wire the GitHub workflows

**Files:**
- Create: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/.github/workflows/agent-collaboration-claim-guard.yml`
- Create: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/.github/workflows/agent-ledger-maintenance.yml`
- Modify: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/.github/pull_request_template.md`

- [ ] **Step 1: Write the failing workflow shape test**

Add to `AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py`:

```python
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]


class WorkflowPresenceTests(unittest.TestCase):
    def test_collaboration_workflows_exist(self):
        required = [
            ROOT / ".github" / "workflows" / "agent-collaboration-claim-guard.yml",
            ROOT / ".github" / "workflows" / "agent-ledger-maintenance.yml",
        ]
        for path in required:
            self.assertTrue(path.exists(), str(path))
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py
```

Expected:

- FAIL because workflow files do not exist

- [ ] **Step 3: Create the workflows**

Create `.github/workflows/agent-collaboration-claim-guard.yml`:

```yaml
name: agent-collaboration-claim-guard

on:
  issue_comment:
    types: [created, edited]
  pull_request:
    types: [opened, edited, synchronize]

jobs:
  validate-collaboration:
    if: github.event.issue.pull_request
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build collaboration payload
        run: echo '{}' | python3 AGENT协作工具/github-actions/build_agent_collaboration_payload.py > payload.json
      - name: Check collaboration rules
        run: cat payload.json | python3 AGENT协作工具/github-actions/check_agent_collaboration.py
```

Create `.github/workflows/agent-ledger-maintenance.yml`:

```yaml
name: agent-ledger-maintenance

on:
  schedule:
    - cron: '*/30 * * * *'
  workflow_dispatch:

jobs:
  maintain-ledger:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate ledger seed files
        run: python3 -m unittest discover -s "AGENT协作工具/github-actions/tests" -p "test_*.py"
```

Update `.github/pull_request_template.md` to add:

```md
## Collaboration Ledger
Task ID: <task_id>
Source Type: <assigned | derived | exploratory>
Validator Agent: <agent>
Claim Pointer: <comment url>
Delivery Pointer: <comment url>
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/agent-collaboration-claim-guard.yml .github/workflows/agent-ledger-maintenance.yml .github/pull_request_template.md AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py
git commit -m "feat(collaboration): wire collaboration workflows"
```

### Task 7: Align gatekeeper and validator ownership

**Files:**
- Modify: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/SKILLS/dual-agent-conflict-gate/gatekeeper_config.json`
- Modify: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/SKILLS/dual-agent-conflict-gate/conflict_gate.py`
- Modify: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/SKILLS/dual-agent-conflict-gate/test_conflict_gate.py`

- [ ] **Step 1: Write the failing validator-only review test**

Append to `AGENT协作工具/SKILLS/dual-agent-conflict-gate/test_conflict_gate.py`:

```python
def test_shared_sync_required_for_validatorless_closeout(self):
    cfg = {
        "ownership": {"solo": ["docs/"], "claude": ["src/"]},
        "shared_requires_approval": [],
        "collaboration_policy": {
            "validation_requires_validator_agent": True,
        },
    }
    issues = MODULE.check_parallel_conditions(
        "solo",
        ["docs/closeout.md"],
        [],
        empty_git_snapshot(),
        cfg,
    )
    self.assertTrue(any(item["code"] == "VALIDATOR_REQUIRED" for item in issues))
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest AGENT协作工具/SKILLS/dual-agent-conflict-gate/test_conflict_gate.py
```

Expected:

- FAIL because the gate has no validator-only rule yet

- [ ] **Step 3: Implement the minimal validator check**

Update `gatekeeper_config.json` by adding:

```json
"validation_requires_validator_agent": true
```

Update `conflict_gate.py` by adding:

```python
if cfg.get("collaboration_policy", {}).get("validation_requires_validator_agent"):
    issues.append({
        "code": "VALIDATOR_REQUIRED",
        "level": "WARNING",
        "detail": "技术验收与记账必须由验证 AGENT 负责，用户不承担代码级验证。",
    })
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
python3 -m unittest AGENT协作工具/SKILLS/dual-agent-conflict-gate/test_conflict_gate.py
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add AGENT协作工具/SKILLS/dual-agent-conflict-gate/gatekeeper_config.json AGENT协作工具/SKILLS/dual-agent-conflict-gate/conflict_gate.py AGENT协作工具/SKILLS/dual-agent-conflict-gate/test_conflict_gate.py
git commit -m "feat(collaboration): require validator ownership"
```

### Task 8: Update entrypoint docs and migration guidance

**Files:**
- Modify: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/README.md`
- Modify: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/docs/README.md`
- Modify: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/docs/agent-collaboration-system-v1-design.md`
- Modify: `/Users/zhangjiangtao/WorkBuddy/dreambuddy-v1/AGENT协作工具/docs/agent-collaboration-system-v1-implementation-plan.md`

- [ ] **Step 1: Write a failing docs entrypoint test**

Add to `AGENT协作工具/github-actions/tests/test_update_agent_ledger.py`:

```python
class DocsEntrypointTests(unittest.TestCase):
    def test_docs_readme_mentions_the_v1_plan(self):
        text = (ROOT / "docs" / "README.md").read_text(encoding="utf-8")
        self.assertIn("agent-collaboration-system-v1-implementation-plan.md", text)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
```

Expected:

- FAIL because the new plan is not linked yet

- [ ] **Step 3: Update the docs entrypoints**

Update `AGENT协作工具/docs/README.md` with:

```md
- `agent-collaboration-system-v1-design.md`：AGENT协作系统 v1 正式设计草案
- `agent-collaboration-system-v1-implementation-plan.md`：AGENT协作系统 v1 实施计划
```

Update `AGENT协作工具/README.md` with:

```md
## AGENT协作系统

当前主干已新增：

- `docs/agent-collaboration-system-v1-design.md`
- `docs/agent-collaboration-system-v1-implementation-plan.md`

后续账本、声明、验证、记账、奖励与自动调度均以此为实现基线。
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add AGENT协作工具/README.md AGENT协作工具/docs/README.md AGENT协作工具/docs/agent-collaboration-system-v1-design.md AGENT协作工具/docs/agent-collaboration-system-v1-implementation-plan.md AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
git commit -m "docs(collaboration): link v1 implementation plan"
```

---

## Verification Checklist

- [ ] `ledger/tasks/index.json` 和 `ledger/rewards/index.json` 能被脚本与测试读取
- [ ] 探索提案、验证结论、账本记账评论模板齐备
- [ ] 协作 payload 能正确提取探索、验证、评分字段
- [ ] checker 能阻止无验证结果和低分交付入账
- [ ] ledger updater 能根据分数计算质量系数与最终奖励
- [ ] claim guard workflow 能在 PR/评论事件上运行
- [ ] ledger maintenance workflow 能定时扫描并校验账本
- [ ] gatekeeper 能显式提醒“技术验证归验证 AGENT”
- [ ] 文档入口和设计/计划文档保持一致

## Self-Review Notes

Spec coverage:

- 账本设计：Task 1
- 探索与专属任务：Task 2, Task 3, Task 4
- 验证与评分：Task 4, Task 5, Task 7
- GitHub 原生落地：Task 3, Task 4, Task 5, Task 6
- 文档迁移与入口：Task 8

Placeholder scan:

- 本计划未使用 `TBD`、`TODO` 或“后续补细节”式步骤
- 所有任务都给出明确文件路径、命令和期望结果

Type consistency:

- `source_type` 统一使用 `assigned | derived | exploratory`
- 验证结果统一使用 `ACCEPTED | REWORK | BLOCK`
- 工作流脚本统一围绕 `build_agent_collaboration_payload.py`、`check_agent_collaboration.py`、`update_agent_ledger.py`

## Execution Handoff

Plan complete and saved to `AGENT协作工具/docs/agent-collaboration-system-v1-implementation-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
