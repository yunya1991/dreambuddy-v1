import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "SKILLS" / "collab-ledger-planner" / "plan_to_tasks.py"
SPEC = importlib.util.spec_from_file_location("plan_to_tasks", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class PlanToTasksTests(unittest.TestCase):
    def test_generates_root_phase_and_children(self):
        plan = "\n".join(
            [
                "# Hub v2 Plan",
                "",
                "## Phase A",
                "- Task 1",
                "- Task 2",
                "",
                "## Phase B",
                "- Task 3",
            ]
        )

        out = MODULE.generate_tasks(
            goal_id="goal-x",
            task_prefix="hubv2",
            workspace_path="7-ARTIFACT-HUB-V2",
            plan_text=plan,
        )

        tasks = out["tasks"]
        self.assertGreaterEqual(len(tasks), 5)
        self.assertTrue(tasks[0]["task_id"].startswith("task-hubv2-"))
        self.assertEqual(tasks[0]["parent_task_id"], "")

        phase_a = next((t for t in tasks if t["title"] == "Phase A"), None)
        self.assertIsNotNone(phase_a)
        task1 = next((t for t in tasks if t["title"] == "Task 1"), None)
        self.assertIsNotNone(task1)
        self.assertEqual(task1["parent_task_id"], phase_a["task_id"])


if __name__ == "__main__":
    unittest.main()
