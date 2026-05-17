# Agent Collaboration System V1 Governance Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有 `AGENT协作系统 v1` 原型补上 `治理 AGENT` 控制面、强治理状态机字段与治理收口规则，使系统从“可声明、可验证”升级到“可编排、可归档、可知识沉淀”。

**Architecture:** 本增量不重写现有 v1 原型，而是在既有账本模板、payload builder、checker、ledger updater 与 workflow 上做最小扩展。核心做法是先扩展任务模型与模板字段，再让 checker 和 updater 认识治理状态机，最后把治理收口与文档入口接入自动化规则。

**Tech Stack:** Markdown, JSON, Python 3 standard library, GitHub Actions, existing `AGENT协作工具` docs/templates/github-actions layout.

---

## Repository Layout Changes

**Create**
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/docs/agent-collaboration-system-v1-governance-agent-implementation-plan.md`

**Modify**
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/ledger/templates/task-record.json`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/templates/pr-comment-started.md`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/templates/pr-comment-updated.md`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/templates/pr-comment-done.md`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/templates/pr-comment-validation-result.md`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/docs/superpowers/templates/agent-task-card.md`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/.github/pull_request_template.md`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/build_agent_collaboration_payload.py`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/check_agent_collaboration.py`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/update_agent_ledger.py`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_update_agent_ledger.py`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/.github/workflows/agent-collaboration-claim-guard.yml`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/.github/workflows/agent-ledger-maintenance.yml`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/docs/README.md`
- `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/README.md`

---

## Increment Scope

本增量只落以下能力：

- `治理 AGENT` 作为正式控制面角色进入任务模型与模板
- 任务字段扩展到支持 `goal_id / depends_on / dependency_gate / shared_boundary / sync_checkpoint / current_sync_state`
- checker 能识别非法状态跳转、串行依赖未满足与共享同步待审
- ledger updater 能生成 `governance_closure` 并约束 `ledgered -> archived -> knowledge_synced`
- workflow 与文档入口能感知治理增量计划

本增量暂不做：

- 独立治理服务
- 自动任务拆解算法
- 跨仓库治理
- 复杂 FAQ 自动生成

---

### Task 1: Extend the task ledger schema for governance

**Files:**
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_update_agent_ledger.py`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/ledger/templates/task-record.json`

- [ ] **Step 1: Write the failing governance schema test**

Append to `AGENT协作工具/github-actions/tests/test_update_agent_ledger.py`:

```python
class GovernanceTaskTemplateTests(unittest.TestCase):
    def test_task_template_exposes_governance_fields(self):
        data = json.loads(
            (ROOT / "ledger" / "templates" / "task-record.json").read_text(
                encoding="utf-8"
            )
        )
        required = [
            "goal_id",
            "parent_task_id",
            "depends_on",
            "dependency_gate",
            "shared_boundary",
            "sync_checkpoint",
            "current_sync_state",
            "validation_pointer",
            "archived_at",
            "knowledge_synced_at",
            "next_required_action",
            "governance_closure",
        ]
        for key in required:
            self.assertIn(key, data)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
```

Expected:

- FAIL because `task-record.json` does not expose the governance fields yet

- [ ] **Step 3: Extend the task template with governance fields**

Update `AGENT协作工具/ledger/templates/task-record.json` to:

```json
{
  "goal_id": "goal-example",
  "task_id": "task-example",
  "parent_task_id": "",
  "title": "Example task",
  "source_type": "assigned",
  "task_type": "parallel",
  "mode": "PHASE_BROADCAST",
  "status": "planned",
  "depends_on": [],
  "dependency_gate": "accepted",
  "shared_boundary": [],
  "sync_checkpoint": [],
  "current_sync_state": "none",
  "owner_agent": "",
  "validator_agent": "",
  "governance_agent": "",
  "exclusive_owner_agent": "",
  "exclusive_until": "",
  "branch": "",
  "workspace_path": "",
  "claim_pointer": "",
  "delivery_pointer": "",
  "validation_pointer": "",
  "score": null,
  "reward": null,
  "final_credit_agent": "",
  "archived_at": "",
  "knowledge_synced_at": "",
  "next_required_action": "",
  "governance_closure": {
    "archive_summary": "",
    "index_updates": [],
    "faq_decision": "",
    "faq_entries": [],
    "rollup_effect": "",
    "followup_tasks": [],
    "closure_agent": "",
    "closure_completed_at": ""
  }
}
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
git add AGENT协作工具/ledger/templates/task-record.json AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
git commit -m "feat(collaboration): extend governance task schema"
```

### Task 2: Surface governance fields in templates and task entrypoints

**Files:**
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/templates/pr-comment-started.md`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/templates/pr-comment-updated.md`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/templates/pr-comment-done.md`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/templates/pr-comment-validation-result.md`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/docs/superpowers/templates/agent-task-card.md`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/.github/pull_request_template.md`

- [ ] **Step 1: Write the failing governance template test**

Append to `AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py`:

```python
class GovernanceTemplateFieldTests(unittest.TestCase):
    def test_started_template_and_task_card_surface_governance_fields(self):
        started = (ROOT / "templates" / "pr-comment-started.md").read_text(
            encoding="utf-8"
        )
        task_card = (
            ROOT.parents[1] / "docs" / "superpowers" / "templates" / "agent-task-card.md"
        ).read_text(encoding="utf-8")
        pr_template = (ROOT.parents[1] / ".github" / "pull_request_template.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("Governance Agent:", started)
        self.assertIn("Task Type:", started)
        self.assertIn("Dependency Gate:", task_card)
        self.assertIn("Next Required Action:", task_card)
        self.assertIn("Governance Agent:", pr_template)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py
```

Expected:

- FAIL because the governance-oriented fields do not exist in the templates yet

- [ ] **Step 3: Extend the templates with governance fields**

Insert into `AGENT协作工具/templates/pr-comment-started.md`:

```md
Governance Agent: <agent>
Task Type: <parallel | serial | shared-sync>
Dependency Gate: <planned | accepted | ledgered | none>
Current Sync State: <none | pending | in_review | cleared>
Next Required Action: <governance / developer / validator step>
```

Insert into `AGENT协作工具/templates/pr-comment-updated.md`:

```md
Governance Agent: <agent>
Task Type: <parallel | serial | shared-sync>
Current Sync State: <none | pending | in_review | cleared>
Next Required Action: <updated next step>
```

Insert into `AGENT协作工具/templates/pr-comment-done.md`:

```md
Validation Pointer: <comment url or pointer>
Archive Summary: <one-line governance closeout summary>
```

Insert into `AGENT协作工具/templates/pr-comment-validation-result.md`:

```md
Governance Handoff: <ledgered | archived | knowledge_synced pending>
```

Insert into `docs/superpowers/templates/agent-task-card.md`:

```md
## Governance
- Governance Agent:
- Goal ID:
- Parent Task ID:
- Task Type:
- Depends On:
- Dependency Gate:
- Shared Boundary:
- Sync Checkpoint:
- Current Sync State:
- Next Required Action:
```

Insert into `.github/pull_request_template.md`:

```md
Governance Agent: <agent>
Task Type: <parallel | serial | shared-sync>
Dependency Gate: <planned | accepted | ledgered | none>
Next Required Action: <who does what next>
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
git add AGENT协作工具/templates docs/superpowers/templates/agent-task-card.md .github/pull_request_template.md AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py
git commit -m "feat(collaboration): surface governance template fields"
```

### Task 3: Extend the collaboration payload builder for governance signals

**Files:**
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/build_agent_collaboration_payload.py`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py`

- [ ] **Step 1: Write the failing parser test**

Append to `AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py`:

```python
    def test_extracts_governance_and_state_machine_fields(self):
        raw = {
            "branch": "agent/solo/governance-v1",
            "pr_body": "## Owner Agent\nOwner Agent: SOLO\n",
            "comments": [
                "[协作开工声明 / STARTED]\n\n"
                "Agent: SOLO\n"
                "Task ID: task-governance-1\n"
                "Governance Agent: SOLO-GOV\n"
                "Task Type: shared-sync\n"
                "Dependency Gate: accepted\n"
                "Current Sync State: pending\n"
                "Next Required Action: validator sync review\n"
                "状态: STARTED\n",
                "[验证结论 / VALIDATION_RESULT]\n\n"
                "Validator: Claude Code\n"
                "Score: 91\n"
                "Decision: ACCEPTED\n"
                "Governance Handoff: ledgered\n",
            ],
        }
        payload = MODULE.build_payload(raw)
        self.assertEqual(payload["governance_agent"], "SOLO-GOV")
        self.assertEqual(payload["task_type"], "shared-sync")
        self.assertEqual(payload["dependency_gate"], "accepted")
        self.assertEqual(payload["current_sync_state"], "pending")
        self.assertEqual(payload["next_required_action"], "validator sync review")
        self.assertEqual(payload["governance_handoff"], "ledgered")
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_build_agent_collaboration_payload.py
```

Expected:

- FAIL because `build_payload()` does not extract the governance fields yet

- [ ] **Step 3: Implement the minimal parser changes**

Update `AGENT协作工具/github-actions/build_agent_collaboration_payload.py` to add the new fields:

```python
def last_comment_with_prefix(comments, prefix):
    matched = [comment for comment in comments if comment.startswith(prefix)]
    return matched[-1] if matched else ""


def build_payload(raw):
    comments = raw.get("comments", [])
    latest_started = last_comment_with_prefix(comments, "[协作开工声明 / STARTED]")
    latest_validation = last_comment_with_prefix(
        comments, "[验证结论 / VALIDATION_RESULT]"
    )
    score = extract_field(latest_validation, "Score")
    return {
        "branch": raw.get("branch", ""),
        "exploration_present": bool(
            last_comment_with_prefix(comments, "[探索提案 / EXPLORATION_PROPOSAL]")
        ),
        "validation_decision": extract_field(latest_validation, "Decision"),
        "validation_score": int(score) if score else None,
        "governance_agent": extract_field(latest_started, "Governance Agent"),
        "task_type": extract_field(latest_started, "Task Type"),
        "dependency_gate": extract_field(latest_started, "Dependency Gate"),
        "current_sync_state": extract_field(latest_started, "Current Sync State"),
        "next_required_action": extract_field(latest_started, "Next Required Action"),
        "governance_handoff": extract_field(latest_validation, "Governance Handoff"),
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
git commit -m "feat(collaboration): parse governance payload fields"
```

### Task 4: Enforce governance state machine rules in the collaboration checker

**Files:**
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/check_agent_collaboration.py`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py`

- [ ] **Step 1: Write the failing checker tests**

Append to `AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py`:

```python
    def test_blocks_invalid_transition_to_knowledge_synced(self):
        payload = {
            "current_status": "accepted",
            "requested_status": "knowledge_synced",
        }
        result = MODULE.evaluate_payload(payload)
        self.assertEqual(result["decision"], "BLOCK")
        self.assertIn("RULE_INVALID_STATUS_TRANSITION", result["reason_codes"])

    def test_blocks_serial_task_when_dependency_is_not_satisfied(self):
        payload = {
            "task_type": "serial",
            "dependency_satisfied": False,
        }
        result = MODULE.evaluate_payload(payload)
        self.assertEqual(result["decision"], "BLOCK")
        self.assertIn("RULE_DEPENDENCY_NOT_SATISFIED", result["reason_codes"])

    def test_blocks_shared_sync_task_when_sync_review_is_missing(self):
        payload = {
            "task_type": "shared-sync",
            "current_sync_state": "pending",
            "sync_review_present": False,
        }
        result = MODULE.evaluate_payload(payload)
        self.assertEqual(result["decision"], "BLOCK")
        self.assertIn("RULE_SYNC_REVIEW_REQUIRED", result["reason_codes"])
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_check_agent_collaboration.py
```

Expected:

- FAIL because the checker only understands validation score and exploration approval

- [ ] **Step 3: Implement the minimal governance rule engine**

Update `AGENT协作工具/github-actions/check_agent_collaboration.py`:

```python
ALLOWED_TRANSITIONS = {
    "accepted": {"ledgered"},
    "ledgered": {"archived"},
    "archived": {"knowledge_synced"},
}


def evaluate_payload(payload):
    reason_codes = []
    if payload.get("exploration_present") and not payload.get("validation_decision"):
        reason_codes.append("RULE_COLLAB_VALIDATION_REQUIRED")
    if payload.get("validation_score") is not None and payload["validation_score"] < 60:
        reason_codes.append("RULE_COLLAB_SCORE_TOO_LOW")

    current_status = payload.get("current_status")
    requested_status = payload.get("requested_status")
    if current_status and requested_status:
        allowed = ALLOWED_TRANSITIONS.get(current_status, set())
        if requested_status not in allowed:
            reason_codes.append("RULE_INVALID_STATUS_TRANSITION")

    if payload.get("task_type") == "serial" and not payload.get("dependency_satisfied", True):
        reason_codes.append("RULE_DEPENDENCY_NOT_SATISFIED")

    if (
        payload.get("task_type") == "shared-sync"
        and payload.get("current_sync_state") == "pending"
        and not payload.get("sync_review_present", False)
    ):
        reason_codes.append("RULE_SYNC_REVIEW_REQUIRED")

    decision = "PASS" if not reason_codes else "BLOCK"
    return {"decision": decision, "reason_codes": reason_codes}
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
git commit -m "feat(collaboration): enforce governance state rules"
```

### Task 5: Extend the ledger updater for governance closure

**Files:**
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/update_agent_ledger.py`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_update_agent_ledger.py`

- [ ] **Step 1: Write the failing governance closure tests**

Append to `AGENT协作工具/github-actions/tests/test_update_agent_ledger.py`:

```python
class GovernanceClosureTests(unittest.TestCase):
    def test_builds_governance_closure_record(self):
        closure = MODULE.build_governance_closure(
            archive_summary="closed with sync notes",
            index_updates=["AGENT协作工具/docs/README.md"],
            faq_decision="written",
            faq_entries=["shared-sync closeout"],
            closure_agent="SOLO-GOV",
        )
        self.assertEqual(closure["closure_agent"], "SOLO-GOV")
        self.assertEqual(closure["faq_decision"], "written")
        self.assertTrue(closure["closure_completed_at"].endswith("Z"))

    def test_rejects_knowledge_sync_without_closure_data(self):
        task = {
            "status": "archived",
            "governance_closure": {
                "archive_summary": "",
                "index_updates": [],
                "faq_decision": "",
                "faq_entries": [],
                "closure_agent": "",
                "closure_completed_at": "",
            },
        }
        with self.assertRaises(ValueError):
            MODULE.apply_status_transition(task, "knowledge_synced")
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
```

Expected:

- FAIL because the updater has no governance closure helpers yet

- [ ] **Step 3: Implement the minimal governance closure helpers**

Update `AGENT协作工具/github-actions/update_agent_ledger.py`:

```python
def build_governance_closure(
    archive_summary,
    index_updates,
    faq_decision,
    faq_entries,
    closure_agent,
):
    return {
        "archive_summary": archive_summary,
        "index_updates": index_updates,
        "faq_decision": faq_decision,
        "faq_entries": faq_entries,
        "closure_agent": closure_agent,
        "closure_completed_at": utc_now(),
    }


def apply_status_transition(task, requested_status):
    if requested_status == "knowledge_synced":
        closure = task.get("governance_closure", {})
        if not closure.get("archive_summary"):
            raise ValueError("archive_summary required")
        if not closure.get("index_updates"):
            raise ValueError("index_updates required")
        if not closure.get("faq_decision"):
            raise ValueError("faq_decision required")
        if not closure.get("closure_agent"):
            raise ValueError("closure_agent required")
        task["knowledge_synced_at"] = utc_now()
    task["status"] = requested_status
    return task
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
git add AGENT协作工具/github-actions/update_agent_ledger.py AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
git commit -m "feat(collaboration): add governance closure updater"
```

### Task 6: Wire governance docs and workflow entrypoints

**Files:**
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/github-actions/tests/test_update_agent_ledger.py`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/.github/workflows/agent-ledger-maintenance.yml`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/docs/README.md`
- Modify: `/Users/zhangjiangtao/WorkBuddy/_wt_agent_main_merge/AGENT协作工具/README.md`

- [ ] **Step 1: Write the failing docs entrypoint test**

Append to `AGENT协作工具/github-actions/tests/test_update_agent_ledger.py`:

```python
    def test_docs_readmes_link_governance_increment_plan(self):
        root_text = (ROOT / "README.md").read_text(encoding="utf-8")
        docs_text = (ROOT / "docs" / "README.md").read_text(encoding="utf-8")
        rel = "agent-collaboration-system-v1-governance-agent-implementation-plan.md"
        self.assertIn(rel, root_text)
        self.assertIn(rel, docs_text)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
```

Expected:

- FAIL because the new governance increment plan is not linked yet

- [ ] **Step 3: Update docs entrypoints and maintenance workflow**

Update `AGENT协作工具/docs/README.md`:

```md
- `agent-collaboration-system-v1-governance-agent-implementation-plan.md`：治理 AGENT 与强治理状态机字段扩展实施计划
```

Update `AGENT协作工具/README.md`:

```md
- `AGENT协作工具/docs/agent-collaboration-system-v1-governance-agent-implementation-plan.md`：治理 AGENT 增量实施计划
```

Update `.github/workflows/agent-ledger-maintenance.yml` to keep the full governance test suite visible:

```yaml
      - name: Validate collaboration and governance assets
        run: python3 -m unittest discover -s "AGENT协作工具/github-actions/tests" -p "test_*.py"
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
python3 -m unittest AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
python3 -m unittest discover -s AGENT协作工具/github-actions/tests -p 'test_*.py'
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add AGENT协作工具/docs/README.md AGENT协作工具/README.md .github/workflows/agent-ledger-maintenance.yml AGENT协作工具/github-actions/tests/test_update_agent_ledger.py
git commit -m "docs(collaboration): link governance increment plan"
```

---

## Verification Checklist

- [ ] `task-record.json` 包含治理字段与 `governance_closure`
- [ ] 评论模板、任务卡与 PR 模板暴露 `Governance Agent` 与状态机字段
- [ ] payload builder 能提取治理字段、同步状态与治理交接意图
- [ ] checker 能阻断非法状态跳转、未满足串行依赖与缺失同步审查
- [ ] ledger updater 能构造 `governance_closure` 并约束 `knowledge_synced`
- [ ] 文档入口已挂出治理增量 plan

## Self-Review Notes

Spec coverage:

- 强治理三角色模型：Task 1, Task 2, Task 6
- 任务状态机与字段扩展：Task 1, Task 3, Task 4, Task 5
- 并行 / 串行 / 共享同步编排约束：Task 3, Task 4
- 归档 / 索引 / FAQ 沉淀：Task 5, Task 6

Placeholder scan:

- 本计划未使用 `TODO`、`TBD` 或“后续补上”式步骤
- 每个任务都包含实际测试、命令、最小实现与提交切片

Type consistency:

- 统一使用 `developer agent / validator agent / governance agent`
- 状态统一使用 `planned / ready / claimed / in_progress / delivered / validating / accepted / rework_required / blocked / ledgered / archived / knowledge_synced`
- 治理收口对象统一使用 `governance_closure`

## Execution Handoff

Plan complete and saved to `AGENT协作工具/docs/agent-collaboration-system-v1-governance-agent-implementation-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
