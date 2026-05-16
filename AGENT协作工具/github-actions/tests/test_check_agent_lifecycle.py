import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "check_agent_lifecycle.py"
SPEC = importlib.util.spec_from_file_location("check_agent_lifecycle", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class LifecycleCheckerTests(unittest.TestCase):
    def test_rule_catalog_and_checker_mapping_stay_in_sync(self):
        rule_ids = {rule["id"] for rule in MODULE.load_rules()}
        self.assertEqual(rule_ids, set(MODULE.RULE_CHECKERS))

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
            "comments": ["STARTED", "DONE"],
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
            "comments": ["DONE"],
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
            "comments": ["STARTED", "DONE"],
        }
        result = MODULE.evaluate_payload(payload)
        self.assertEqual(result["decision"], "BLOCK")
        self.assertIn("RULE_009_BRANCH_POLICY_ENFORCED", result["reason_codes"])


if __name__ == "__main__":
    unittest.main()
