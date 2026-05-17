import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parent / "conflict_gate.py"
SPEC = importlib.util.spec_from_file_location("conflict_gate", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def empty_git_snapshot():
    return {"modified_files": [], "staged_files": [], "untracked_files": []}


class ConflictGateTests(unittest.TestCase):
    def test_nested_ownership_prefers_more_specific_domain(self):
        cfg = {
            "ownership": {
                "solo": ["7-ARTIFACT-HUB-V2/src/"],
                "claude": ["7-ARTIFACT-HUB-V2/src/ops-ui/"],
            },
            "shared_requires_approval": [],
        }

        issues = MODULE.check_file_boundaries(
            "claude",
            ["7-ARTIFACT-HUB-V2/src/ops-ui/server.ts"],
            empty_git_snapshot(),
            cfg,
        )

        self.assertEqual(issues, [])

    def test_parallel_conditions_allow_more_specific_nested_domain(self):
        cfg = {
            "ownership": {
                "solo": ["7-ARTIFACT-HUB-V2/src/"],
                "claude": ["7-ARTIFACT-HUB-V2/src/ops-ui/"],
            },
            "contracts": {},
        }

        issues = MODULE.check_parallel_conditions(
            "claude",
            ["7-ARTIFACT-HUB-V2/src/ops-ui/routes/index.ts"],
            [],
            empty_git_snapshot(),
            cfg,
        )

        self.assertEqual(issues, [])

    def test_nested_ownership_still_blocks_other_owner_root_file(self):
        cfg = {
            "ownership": {
                "solo": ["7-ARTIFACT-HUB-V2/src/"],
                "claude": ["7-ARTIFACT-HUB-V2/src/ops-ui/"],
            },
            "shared_requires_approval": [],
        }

        issues = MODULE.check_file_boundaries(
            "claude",
            ["7-ARTIFACT-HUB-V2/src/router-engine.ts"],
            empty_git_snapshot(),
            cfg,
        )

        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0]["code"], "BOUNDARY_VIOLATION")

    def test_shared_boundaries_field_triggers_strong_sync_warning(self):
        cfg = {
            "ownership": {"solo": ["docs/"], "claude": ["src/"]},
            "shared_boundaries": ["README.md"],
            "shared_requires_approval": [],
        }

        issues = MODULE.check_file_boundaries(
            "solo", ["README.md"], empty_git_snapshot(), cfg
        )

        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0]["code"], "SHARED_FILE_CONFLICT")
        self.assertIn("共享边界", issues[0]["detail"])
        self.assertIn("强同步", issues[0]["detail"])

    def test_legacy_shared_requires_approval_still_supported(self):
        cfg = {
            "ownership": {"solo": ["docs/"], "claude": ["src/"]},
            "shared_requires_approval": ["README.md"],
        }

        issues = MODULE.check_file_boundaries(
            "solo", ["README.md"], empty_git_snapshot(), cfg
        )

        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0]["code"], "SHARED_FILE_CONFLICT")

    def test_shared_file_block_recommends_strong_sync_mode(self):
        result = MODULE.aggregate(
            [
                {
                    "code": "SHARED_FILE_CONFLICT",
                    "level": "BLOCK",
                    "detail": "shared boundary conflict",
                }
            ]
        )

        self.assertEqual(result["decision"], "BLOCK")
        self.assertIn("共享边界", result["recommended_action"])
        self.assertIn("强同步", result["recommended_action"])

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


if __name__ == "__main__":
    unittest.main()
