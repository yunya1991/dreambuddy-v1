import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = Path(__file__).resolve().parents[1] / "build_agent_collaboration_payload.py"
SPEC = importlib.util.spec_from_file_location(
    "build_agent_collaboration_payload", MODULE_PATH
)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class TemplatePresenceTests(unittest.TestCase):
    def test_required_collaboration_templates_exist(self):
        required = [
            "templates/pr-comment-exploration-proposal.md",
            "templates/pr-comment-validation-result.md",
            "templates/pr-comment-ledger-entry.md",
        ]
        for rel in required:
            self.assertTrue((ROOT / rel).exists(), rel)


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


if __name__ == "__main__":
    unittest.main()
