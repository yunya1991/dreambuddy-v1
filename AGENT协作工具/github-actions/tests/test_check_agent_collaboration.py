import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = Path(__file__).resolve().parents[1] / "check_agent_collaboration.py"
SPEC = importlib.util.spec_from_file_location("check_agent_collaboration", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class WorkflowPresenceTests(unittest.TestCase):
    def test_collaboration_workflows_exist(self):
        required = [
            ROOT / ".github" / "workflows" / "agent-collaboration-claim-guard.yml",
            ROOT / ".github" / "workflows" / "agent-ledger-maintenance.yml",
        ]
        for path in required:
            self.assertTrue(path.exists(), str(path))


class GovernanceWorkflowTests(unittest.TestCase):
    def test_claim_guard_runs_single_governance_cycle_controller(self):
        text = (
            ROOT / ".github" / "workflows" / "agent-collaboration-claim-guard.yml"
        ).read_text(encoding="utf-8")
        self.assertIn("Run governance ledger cycle", text)
        self.assertIn("run_governance_ledger_cycle.py", text)
        self.assertNotIn("Run collaboration checker", text)


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

    def test_blocks_when_validation_score_is_too_low(self):
        payload = {
            "exploration_present": True,
            "validation_decision": "ACCEPTED",
            "validation_score": 59,
        }

        result = MODULE.evaluate_payload(payload)

        self.assertEqual(result["decision"], "BLOCK")
        self.assertIn("RULE_COLLAB_SCORE_TOO_LOW", result["reason_codes"])

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


if __name__ == "__main__":
    unittest.main()
