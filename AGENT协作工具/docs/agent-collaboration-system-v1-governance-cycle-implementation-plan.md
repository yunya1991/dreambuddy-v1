# Agent Collaboration System V1 Governance Cycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `AGENT协作系统 v1` 建立单脚本控制器最小闭环，使系统能够基于 GitHub 事件上下文自动执行 `accepted -> ledgered -> archived -> knowledge_synced`，并将账本、奖励与治理收口写回真源。

**Architecture:** 新增 `run_governance_ledger_cycle.py` 作为唯一业务入口，workflow 只负责准备输入和触发执行。现有 `build_agent_collaboration_payload.py`、`check_agent_collaboration.py`、`update_agent_ledger.py` 保留，但职责收敛为纯函数依赖模块，由控制器统一编排，并输出对未来 Trae 巡检型 AGENT 友好的结构化结果。

**Tech Stack:** Python 3.11 standard library, JSON, unittest, GitHub Actions YAML, existing `AGENT协作工具/github-actions` layout.

---

## File Structure

**Create**
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/run_governance_ledger_cycle.py`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_run_governance_ledger_cycle.py`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/docs/agent-collaboration-system-v1-governance-cycle-implementation-plan.md`

**Modify**
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/build_agent_collaboration_payload.py`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/check_agent_collaboration.py`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/update_agent_ledger.py`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_update_agent_ledger.py`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/.github/workflows/agent-collaboration-claim-guard.yml`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/docs/README.md`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/README.md`

**Responsibilities**
- `run_governance_ledger_cycle.py`: 编排一次最小闭环执行周期，输出 `cycle_result`
- `build_agent_collaboration_payload.py`: 解析评论与 PR body，标准化 payload
- `check_agent_collaboration.py`: 对状态推进请求做纯规则判定，返回 `decision / reason_codes / recommended_next_action`
- `update_agent_ledger.py`: 作为唯一账本写入口，负责任务推进、奖励写回、治理收口校验
- `test_run_governance_ledger_cycle.py`: 控制器集成测试，覆盖成功链、阻断链、幂等性与零副作用

---

## Scope Guard

本实施计划只实现：

- GitHub 事件上下文输入模式
- 单任务上下文执行
- `accepted -> ledgered -> archived -> knowledge_synced` 最小闭环
- 任务账本与奖励账本真实写回
- 结构化 `cycle_result`
- 对未来 Trae 巡检型 `治理 AGENT / 验证者 AGENT` 友好的 `reason_codes / next_required_action / repair_hint`

本实施计划明确不实现：

- 自动任务拆解
- 自动排程
- 仓库级主动扫描
- 自动探索提案授权
- 自动 FAQ 正文生成

---

### Task 1: Enrich the collaboration payload for cycle execution

**Files:**
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/build_agent_collaboration_payload.py`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py`

- [ ] **Step 1: Write the failing payload test**

Append to `AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py`:

```python
    def test_extracts_cycle_transition_fields(self):
        raw = {
            "branch": "agent/solo/governance-cycle",
            "pr_body": "## Owner Agent\nOwner Agent: SOLO\n",
            "comments": [
                "[协作开工声明 / STARTED]\n\n"
                "Agent: SOLO\n"
                "Task ID: task-cycle-1\n"
                "Governance Agent: SOLO-GOV\n"
                "Task Type: serial\n"
                "Dependency Gate: accepted\n"
                "Current Sync State: cleared\n"
                "Next Required Action: governance ledger write\n"
                "状态: STARTED\n",
                "[验证结论 / VALIDATION_RESULT]\n\n"
                "Validator: Claude Code\n"
                "Hard Gate Result: PASS\n"
                "Score: 90\n"
                "Decision: ACCEPTED\n"
                "Governance Handoff: ledgered\n",
                "[账本记账 / LEDGER_ENTRY]\n\n"
                "Validator: Claude Code\n"
                "Task ID: task-cycle-1\n"
                "Accepted Delivery Pointer: pointer-1\n"
                "Reward Result: 12\n",
            ],
        }

        payload = MODULE.build_payload(raw)

        self.assertEqual(payload["task_id"], "task-cycle-1")
        self.assertEqual(payload["requested_status"], "ledgered")
        self.assertTrue(payload["validation_present"])
        self.assertTrue(payload["ledger_entry_present"])
        self.assertEqual(payload["recommended_next_action"], "governance ledger write")
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py
```

Expected:

- FAIL because `task_id`, `requested_status`, `validation_present`, `ledger_entry_present`, and `recommended_next_action` are not exposed yet

- [ ] **Step 3: Implement the minimal payload enrichment**

Update `AGENT协作工具/github-actions/build_agent_collaboration_payload.py` with:

```python
def handoff_to_requested_status(handoff):
    mapping = {
        "ledgered": "ledgered",
        "archived": "archived",
        "knowledge_synced": "knowledge_synced",
        "knowledge_synced pending": "knowledge_synced",
    }
    return mapping.get(handoff.strip(), "")


def build_payload(raw):
    comments = raw.get("comments", [])
    latest_started = last_comment_with_prefix(comments, "[协作开工声明 / STARTED]")
    latest_exploration = last_comment_with_prefix(
        comments, "[探索提案 / EXPLORATION_PROPOSAL]"
    )
    latest_validation = last_comment_with_prefix(
        comments, "[验证结论 / VALIDATION_RESULT]"
    )
    latest_ledger_entry = last_comment_with_prefix(comments, "[账本记账 / LEDGER_ENTRY]")
    score = extract_field(latest_validation, "Score")
    handoff = extract_field(latest_validation, "Governance Handoff")

    return {
        "branch": raw.get("branch", ""),
        "task_id": extract_field(latest_started, "Task ID")
        or extract_field(latest_ledger_entry, "Task ID"),
        "exploration_present": bool(latest_exploration),
        "validation_present": bool(latest_validation),
        "ledger_entry_present": bool(latest_ledger_entry),
        "validation_decision": extract_field(latest_validation, "Decision"),
        "validation_score": int(score) if score else None,
        "governance_agent": extract_field(latest_started, "Governance Agent"),
        "task_type": extract_field(latest_started, "Task Type"),
        "dependency_gate": extract_field(latest_started, "Dependency Gate"),
        "current_sync_state": extract_field(latest_started, "Current Sync State"),
        "next_required_action": extract_field(latest_started, "Next Required Action"),
        "recommended_next_action": extract_field(latest_started, "Next Required Action"),
        "governance_handoff": handoff,
        "requested_status": handoff_to_requested_status(handoff),
    }
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
git commit -m "feat(collaboration): enrich governance cycle payload"
```

### Task 2: Make checker and updater controller-friendly

**Files:**
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/check_agent_collaboration.py`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/update_agent_ledger.py`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_update_agent_ledger.py`

- [ ] **Step 1: Write the failing checker and updater tests**

Append to `AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py`:

```python
    def test_returns_recommended_next_action_for_block(self):
        payload = {
            "task_type": "shared-sync",
            "current_sync_state": "pending",
            "sync_review_present": False,
        }
        result = MODULE.evaluate_payload(payload)
        self.assertEqual(result["decision"], "BLOCK")
        self.assertEqual(
            result["recommended_next_action"],
            "governance: add sync review evidence",
        )
```

Append to `AGENT协作工具/github-actions/tests/test_update_agent_ledger.py`:

```python
class GovernanceUpdaterIOTests(unittest.TestCase):
    def test_transition_result_reports_state_change(self):
        task = {
            "task_id": "task-cycle-1",
            "status": "accepted",
            "governance_closure": {
                "archive_summary": "",
                "index_updates": [],
                "faq_decision": "",
                "faq_entries": [],
                "closure_agent": "",
                "closure_completed_at": "",
            },
        }
        updated, result = MODULE.apply_status_transition(task, "ledgered")
        self.assertEqual(updated["status"], "ledgered")
        self.assertEqual(result["previous_status"], "accepted")
        self.assertEqual(result["new_status"], "ledgered")
        self.assertTrue(result["state_changed"])
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py
python3 -m unittest AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
```

Expected:

- FAIL because checker does not return `recommended_next_action`, and updater does not return a transition result object

- [ ] **Step 3: Implement minimal controller-friendly outputs**

Update `AGENT协作工具/github-actions/check_agent_collaboration.py`:

```python
def evaluate_payload(payload):
    reason_codes = []
    recommended_next_action = ""
    if payload.get("exploration_present") and not payload.get("validation_decision"):
        reason_codes.append("RULE_COLLAB_VALIDATION_REQUIRED")
        recommended_next_action = "validator: publish validation result"
    if payload.get("validation_score") is not None and payload["validation_score"] < 60:
        reason_codes.append("RULE_COLLAB_SCORE_TOO_LOW")
        recommended_next_action = "developer: rework before ledger write"
    if (
        payload.get("task_type") == "shared-sync"
        and payload.get("current_sync_state") == "pending"
        and not payload.get("sync_review_present", False)
    ):
        reason_codes.append("RULE_SYNC_REVIEW_REQUIRED")
        recommended_next_action = "governance: add sync review evidence"

    decision = "PASS" if not reason_codes else "BLOCK"
    return {
        "decision": decision,
        "reason_codes": reason_codes,
        "recommended_next_action": recommended_next_action,
    }
```

Update `AGENT协作工具/github-actions/update_agent_ledger.py`:

```python
def apply_status_transition(task, requested_status):
    current_status = task.get("status")
    if current_status == requested_status:
        return task, {
            "previous_status": current_status,
            "new_status": requested_status,
            "state_changed": False,
            "knowledge_sync_written": False,
        }

    allowed_statuses = GOVERNANCE_ALLOWED_TRANSITIONS.get(current_status)
    if allowed_statuses is not None and requested_status not in allowed_statuses:
        raise ValueError(
            f"invalid governance transition: {current_status} -> {requested_status}"
        )

    knowledge_sync_written = False
    if requested_status == "knowledge_synced":
        closure = task.get("governance_closure", {})
        required_fields = {
            "archive_summary": "archive_summary required",
            "index_updates": "index_updates required",
            "faq_decision": "faq_decision required",
            "closure_agent": "closure_agent required",
        }
        for field, error_message in required_fields.items():
            if not closure.get(field):
                raise ValueError(error_message)
        task["knowledge_synced_at"] = utc_now()
        knowledge_sync_written = True

    if requested_status == "archived":
        task["archived_at"] = utc_now()

    task["status"] = requested_status
    return task, {
        "previous_status": current_status,
        "new_status": requested_status,
        "state_changed": True,
        "knowledge_sync_written": knowledge_sync_written,
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py
python3 -m unittest AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add AGENT协作工具/github-actions/check_agent_collaboration.py AGENT协作工具/github-actions/update_agent_ledger.py AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
git commit -m "feat(collaboration): prepare governance cycle dependencies"
```

### Task 3: Add the governance cycle controller and integration tests

**Files:**
- Create: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/run_governance_ledger_cycle.py`
- Create: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_run_governance_ledger_cycle.py`

- [ ] **Step 1: Write the failing controller tests**

Create `AGENT协作工具/github-actions/tests/test_run_governance_ledger_cycle.py`:

```python
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "github-actions" / "run_governance_ledger_cycle.py"
SPEC = importlib.util.spec_from_file_location("run_governance_ledger_cycle", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class GovernanceCycleControllerTests(unittest.TestCase):
    def test_advances_accepted_task_to_ledgered_and_writes_reward(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            task_index = tmp_path / "tasks.json"
            reward_index = tmp_path / "rewards.json"
            task_index.write_text(
                json.dumps(
                    {
                        "version": 1,
                        "generated_at": "1970-01-01T00:00:00Z",
                        "open_tasks": [],
                        "tasks": [
                            {
                                "task_id": "task-cycle-1",
                                "status": "accepted",
                                "score": None,
                                "reward": None,
                                "final_credit_agent": "",
                                "governance_closure": {
                                    "archive_summary": "",
                                    "index_updates": [],
                                    "faq_decision": "",
                                    "faq_entries": [],
                                    "closure_agent": "",
                                    "closure_completed_at": "",
                                },
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            reward_index.write_text(
                json.dumps({"version": 1, "generated_at": "1970-01-01T00:00:00Z", "reward_records": []}),
                encoding="utf-8",
            )

            raw = {
                "branch": "agent/solo/governance-cycle",
                "pr_body": "",
                "comments": [
                    "[协作开工声明 / STARTED]\n\n"
                    "Task ID: task-cycle-1\n"
                    "Governance Agent: SOLO-GOV\n"
                    "Task Type: parallel\n"
                    "Dependency Gate: accepted\n"
                    "Current Sync State: cleared\n"
                    "Next Required Action: governance ledger write\n",
                    "[验证结论 / VALIDATION_RESULT]\n\n"
                    "Validator: Claude Code\n"
                    "Hard Gate Result: PASS\n"
                    "Score: 90\n"
                    "Decision: ACCEPTED\n"
                    "Governance Handoff: ledgered\n",
                ],
            }

            result = MODULE.run_cycle(raw, task_index, reward_index)

            self.assertEqual(result["decision"], "PASS")
            self.assertEqual(result["previous_status"], "accepted")
            self.assertEqual(result["new_status"], "ledgered")
            self.assertTrue(result["reward_written"])

    def test_blocks_without_touching_indexes(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            task_index = tmp_path / "tasks.json"
            reward_index = tmp_path / "rewards.json"
            initial_tasks = {
                "version": 1,
                "generated_at": "1970-01-01T00:00:00Z",
                "open_tasks": [],
                "tasks": [
                    {
                        "task_id": "task-cycle-2",
                        "status": "accepted",
                        "governance_closure": {
                            "archive_summary": "",
                            "index_updates": [],
                            "faq_decision": "",
                            "faq_entries": [],
                            "closure_agent": "",
                            "closure_completed_at": "",
                        },
                    }
                ],
            }
            initial_rewards = {"version": 1, "generated_at": "1970-01-01T00:00:00Z", "reward_records": []}
            task_index.write_text(json.dumps(initial_tasks), encoding="utf-8")
            reward_index.write_text(json.dumps(initial_rewards), encoding="utf-8")

            raw = {
                "branch": "agent/solo/governance-cycle",
                "pr_body": "",
                "comments": [
                    "[协作开工声明 / STARTED]\n\n"
                    "Task ID: task-cycle-2\n"
                    "Governance Agent: SOLO-GOV\n"
                    "Task Type: shared-sync\n"
                    "Current Sync State: pending\n"
                    "Next Required Action: governance sync review\n",
                ],
            }

            result = MODULE.run_cycle(raw, task_index, reward_index)

            self.assertEqual(result["decision"], "BLOCK")
            self.assertEqual(
                json.loads(task_index.read_text(encoding=\"utf-8\")),
                initial_tasks,
            )
            self.assertEqual(
                json.loads(reward_index.read_text(encoding=\"utf-8\")),
                initial_rewards,
            )


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_run_governance_ledger_cycle.py
```

Expected:

- FAIL because `run_governance_ledger_cycle.py` does not exist yet

- [ ] **Step 3: Implement the minimal controller**

Create `AGENT协作工具/github-actions/run_governance_ledger_cycle.py`:

```python
import importlib.util
import json
import sys
from pathlib import Path


HERE = Path(__file__).resolve().parent


def load_module(name, file_name):
    path = HERE / file_name
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


BUILDER = load_module("build_agent_collaboration_payload", "build_agent_collaboration_payload.py")
CHECKER = load_module("check_agent_collaboration", "check_agent_collaboration.py")
UPDATER = load_module("update_agent_ledger", "update_agent_ledger.py")


def run_cycle(raw, task_index_path, reward_index_path):
    payload = BUILDER.build_payload(raw)
    task_id = payload.get("task_id", "")
    if not task_id:
        return {
            "task_id": "",
            "decision": "BLOCK",
            "reason_codes": ["RULE_TASK_ID_REQUIRED"],
            "previous_status": "",
            "new_status": "",
            "reward_written": False,
            "knowledge_sync_written": False,
            "next_required_action": "developer: provide task id",
            "repair_hint": "publish STARTED comment with Task ID",
        }

    task_index = json.loads(Path(task_index_path).read_text(encoding="utf-8"))
    reward_index = json.loads(Path(reward_index_path).read_text(encoding="utf-8"))
    task = next((item for item in task_index["tasks"] if item.get("task_id") == task_id), None)
    if task is None:
        return {
            "task_id": task_id,
            "decision": "BLOCK",
            "reason_codes": ["RULE_TASK_NOT_FOUND"],
            "previous_status": "",
            "new_status": "",
            "reward_written": False,
            "knowledge_sync_written": False,
            "next_required_action": "governance: register task in ledger",
            "repair_hint": "add task to tasks/index.json before retrying",
        }

    payload["current_status"] = task.get("status", "")
    payload["sync_review_present"] = any(
        comment.startswith("[设计评审 / DESIGN_REVIEW]") for comment in raw.get("comments", [])
    )
    checker_result = CHECKER.evaluate_payload(payload)
    if checker_result["decision"] != "PASS":
        return {
            "task_id": task_id,
            "decision": checker_result["decision"],
            "reason_codes": checker_result["reason_codes"],
            "previous_status": task.get("status", ""),
            "new_status": task.get("status", ""),
            "reward_written": False,
            "knowledge_sync_written": False,
            "next_required_action": checker_result.get("recommended_next_action", ""),
            "repair_hint": "fix blocking governance signal before retrying",
        }

    updated_task, transition = UPDATER.apply_status_transition(task, payload["requested_status"])
    reward_written = False
    if payload["requested_status"] == "ledgered" and payload.get("validation_score") is not None:
        reward = UPDATER.calculate_reward(base_reward=10, score=payload["validation_score"])
        record = {
            "task_id": task_id,
            "reward_type": "effective_delivery",
            "base_reward": 10,
            "quality_multiplier": reward["quality_multiplier"],
            "final_reward": reward["final_reward"],
            "credited_agent": updated_task.get("owner_agent", "") or "UNKNOWN",
            "credited_at": UPDATER.utc_now(),
        }
        UPDATER.append_reward_record(reward_index, record)
        updated_task["reward"] = reward["final_reward"]
        reward_written = True

    task_index["generated_at"] = UPDATER.utc_now()
    Path(task_index_path).write_text(json.dumps(task_index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    Path(reward_index_path).write_text(json.dumps(reward_index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return {
        "task_id": task_id,
        "decision": "PASS",
        "reason_codes": [],
        "previous_status": transition["previous_status"],
        "new_status": transition["new_status"],
        "reward_written": reward_written,
        "knowledge_sync_written": transition["knowledge_sync_written"],
        "next_required_action": payload.get("recommended_next_action", ""),
        "repair_hint": "",
    }


if __name__ == "__main__":
    raw = json.load(sys.stdin)
    task_index_path = Path(sys.argv[1])
    reward_index_path = Path(sys.argv[2])
    json.dump(run_cycle(raw, task_index_path, reward_index_path), sys.stdout, ensure_ascii=False, indent=2)
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_run_governance_ledger_cycle.py
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add AGENT协作工具/github-actions/run_governance_ledger_cycle.py AGENT协作工具/github-actions/tests/test_run_governance_ledger_cycle.py
git commit -m "feat(collaboration): add governance cycle controller"
```

### Task 4: Switch the workflow to the single controller

**Files:**
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/.github/workflows/agent-collaboration-claim-guard.yml`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_update_agent_ledger.py`

- [ ] **Step 1: Write the failing workflow entrypoint test**

Append to `AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py`:

```python
class GovernanceWorkflowTests(unittest.TestCase):
    def test_claim_guard_runs_single_governance_cycle_controller(self):
        text = (
            ROOT / ".github" / "workflows" / "agent-collaboration-claim-guard.yml"
        ).read_text(encoding="utf-8")
        self.assertIn("Run governance ledger cycle", text)
        self.assertIn("run_governance_ledger_cycle.py", text)
        self.assertNotIn("Run collaboration checker", text)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py
```

Expected:

- FAIL because the workflow still calls builder/checker separately

- [ ] **Step 3: Update the workflow to call the controller**

Update `.github/workflows/agent-collaboration-claim-guard.yml`:

```yaml
      - name: Run governance ledger cycle
        run: |
          python3 "AGENT协作工具/github-actions/run_governance_ledger_cycle.py" \
            agent_collaboration_raw.json \
            "AGENT协作工具/ledger/tasks/index.json" \
            "AGENT协作工具/ledger/rewards/index.json" > agent_governance_cycle_result.json
          python3 - <<'PY'
          import json
          import sys

          result = json.load(open("agent_governance_cycle_result.json", encoding="utf-8"))
          if result.get("decision") != "PASS":
              print(json.dumps(result, ensure_ascii=False, indent=2))
              sys.exit(1)
          print(json.dumps(result, ensure_ascii=False, indent=2))
          PY
```

Remove the older `Normalize collaboration payload` and `Run collaboration checker` steps.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py
python3 -m unittest AGENT协作工具/github-actions/tests/test_run_governance_ledger_cycle.py
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/agent-collaboration-claim-guard.yml AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py
git commit -m "ci(collaboration): route claim guard through governance cycle"
```

### Task 5: Expose the plan and add full-suite verification

**Files:**
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/docs/README.md`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/README.md`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_update_agent_ledger.py`

- [ ] **Step 1: Write the failing docs entrypoint test**

Append to `AGENT协作工具/github-actions/tests/test_update_agent_ledger.py`:

```python
    def test_docs_readmes_link_governance_cycle_plan(self):
        rel = "agent-collaboration-system-v1-governance-cycle-implementation-plan.md"
        root_text = (ROOT / "README.md").read_text(encoding="utf-8")
        docs_text = (ROOT / "docs" / "README.md").read_text(encoding="utf-8")
        self.assertIn(rel, root_text)
        self.assertIn(rel, docs_text)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
```

Expected:

- FAIL because the new governance cycle plan is not linked yet

- [ ] **Step 3: Update docs entrypoints**

Update `AGENT协作工具/docs/README.md`:

```md
- `agent-collaboration-system-v1-governance-cycle-implementation-plan.md`：治理账本最小闭环控制器实施计划
```

Update `AGENT协作工具/README.md`:

```md
- `AGENT协作工具/docs/agent-collaboration-system-v1-governance-cycle-implementation-plan.md`：治理账本最小闭环控制器实施计划
```

- [ ] **Step 4: Run full verification**

Run:

```bash
python3 -m unittest discover -s AGENT协作工具/github-actions/tests -p 'test_*.py'
python3 -m unittest AGENT协作工具/SKILLS/dual-agent-conflict-gate/test_conflict_gate.py
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add AGENT协作工具/docs/README.md AGENT协作工具/README.md AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
git commit -m "docs(collaboration): expose governance cycle plan"
```

---

## Verification Checklist

- [ ] Payload 能输出控制器所需字段：`task_id`、`requested_status`、`validation_present`、`ledger_entry_present`
- [ ] Checker 能输出 `recommended_next_action`
- [ ] Updater 能返回结构化状态迁移结果，且不破坏现有 reward 逻辑
- [ ] 控制器能完成成功链：`accepted -> ledgered`
- [ ] 控制器能在阻断链中保持账本零副作用
- [ ] Workflow 已改成只触发控制器
- [ ] 文档入口已挂出新的最小闭环 plan

## Self-Review Notes

Spec coverage:

- 最小闭环目标与边界：Task 3, Task 4
- 单控制器组件设计：Task 2, Task 3, Task 4
- 数据流与执行周期：Task 1, Task 2, Task 3
- 测试策略与失败恢复：Task 2, Task 3, Task 4, Task 5

Placeholder scan:

- 本计划未使用 `TODO`、`TBD` 或“后续补上”式步骤
- 每个任务均包含失败测试、运行命令、最小实现和提交切片

Type consistency:

- 总控脚本统一命名为 `run_governance_ledger_cycle.py`
- 统一使用 `decision / reason_codes / recommended_next_action`
- 统一使用 `previous_status / new_status / reward_written / knowledge_sync_written`

## Execution Handoff

Plan complete and saved to `AGENT协作工具/docs/agent-collaboration-system-v1-governance-cycle-implementation-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
