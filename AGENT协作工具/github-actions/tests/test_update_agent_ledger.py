import importlib.util
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "github-actions" / "update_agent_ledger.py"
SPEC = importlib.util.spec_from_file_location("update_agent_ledger", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class LedgerSeedShapeTests(unittest.TestCase):
    def test_task_index_has_required_top_level_keys(self):
        data = json.loads(
            (ROOT / "ledger" / "tasks" / "index.json").read_text(encoding="utf-8")
        )
        self.assertEqual(
            sorted(data.keys()),
            ["generated_at", "open_tasks", "tasks", "version"],
        )


class RewardCalculationTests(unittest.TestCase):
    def test_calculates_quality_weighted_reward(self):
        reward = MODULE.calculate_reward(base_reward=10, score=88)
        self.assertEqual(reward["quality_multiplier"], 1.0)
        self.assertEqual(reward["final_reward"], 10)


class DocsEntrypointTests(unittest.TestCase):
    def test_root_readme_surfaces_v1_docs_directly(self):
        text = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("docs/agent-collaboration-system-v1-design.md", text)
        self.assertIn("docs/agent-collaboration-system-v1-implementation-plan.md", text)

    def test_docs_readme_keeps_migration_guidance(self):
        text = (ROOT / "docs" / "README.md").read_text(encoding="utf-8")
        self.assertIn("docs/superpowers/specs/", text)
        self.assertIn("docs/superpowers/plans/", text)
        self.assertIn("兼容壳", text)


if __name__ == "__main__":
    unittest.main()
