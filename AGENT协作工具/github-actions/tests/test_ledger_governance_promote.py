import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "github-actions" / "ledger_governance_promote.py"
SPEC = importlib.util.spec_from_file_location("ledger_governance_promote", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class LedgerGovernancePromoteTests(unittest.TestCase):
    def test_promotes_planned_to_accepted_and_requires_checklist(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo_root = Path(tmp)
            ledger_path = repo_root / "AGENT协作工具" / "ledger" / "tasks" / "index.json"
            ledger_path.parent.mkdir(parents=True)
            ledger_path.write_text(
                json.dumps(
                    {
                        "version": 1,
                        "generated_at": "1970-01-01T00:00:00Z",
                        "open_tasks": ["task-1"],
                        "tasks": [
                            {
                                "task_id": "task-1",
                                "status": "planned",
                                "workspace_path": "7-ARTIFACT-HUB-V2",
                                "sync_checkpoint": [],
                                "next_required_action": "",
                            }
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )

            with self.assertRaises(ValueError):
                MODULE.promote_tasks(
                    repo_root=repo_root,
                    task_ids=["task-1"],
                    workspace_path="7-ARTIFACT-HUB-V2",
                    to_status="accepted",
                    next_required_action=None,
                    sync_checkpoint=[],
                )

            MODULE.promote_tasks(
                repo_root=repo_root,
                task_ids=["task-1"],
                workspace_path="7-ARTIFACT-HUB-V2",
                to_status="accepted",
                next_required_action="developer: implement X; validator: validate Y",
                sync_checkpoint=["7-ARTIFACT-HUB-V2/OBJECT_MODEL.md"],
            )

            after = json.loads(ledger_path.read_text(encoding="utf-8"))
            self.assertEqual(after["tasks"][0]["status"], "accepted")
            self.assertTrue(after["tasks"][0]["next_required_action"])
            self.assertTrue(after["tasks"][0]["sync_checkpoint"])


if __name__ == "__main__":
    unittest.main()

