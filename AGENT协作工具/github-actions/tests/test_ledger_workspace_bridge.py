import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "github-actions" / "ledger_workspace_bridge.py"
SPEC = importlib.util.spec_from_file_location("ledger_workspace_bridge", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class LedgerWorkspaceBridgeTests(unittest.TestCase):
    def test_joins_open_tasks_with_latest_hub_task_and_result(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo_root = Path(tmp)
            artifacts_root = repo_root / "dreambuddy" / "artifacts"

            (repo_root / "AGENT协作工具" / "ledger" / "tasks").mkdir(parents=True)
            (artifacts_root / "tasks").mkdir(parents=True)
            (artifacts_root / "results").mkdir(parents=True)

            (repo_root / "AGENT协作工具" / "ledger" / "tasks" / "index.json").write_text(
                json.dumps(
                    {
                        "version": 1,
                        "generated_at": "1970-01-01T00:00:00Z",
                        "open_tasks": ["task-ledger-1", "task-ledger-2"],
                        "tasks": [
                            {
                                "task_id": "task-ledger-1",
                                "status": "planned",
                                "workspace_path": "7-ARTIFACT-HUB-V2",
                            },
                            {
                                "task_id": "task-ledger-2",
                                "status": "planned",
                                "workspace_path": "7-ARTIFACT-HUB-V2",
                            },
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )

            (artifacts_root / "tasks" / "task_hub-older.json").write_text(
                json.dumps(
                    {
                        "trace_id": "trace-1",
                        "task_id": "hub-older",
                        "created_at": "2026-05-18T00:00:00Z",
                        "ledger_task_id": "task-ledger-1",
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )

            (artifacts_root / "tasks" / "task_hub-newer.json").write_text(
                json.dumps(
                    {
                        "trace_id": "trace-2",
                        "task_id": "hub-newer",
                        "created_at": "2026-05-18T01:00:00Z",
                        "ledger_task_id": "task-ledger-1",
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )

            (artifacts_root / "results" / "result_hub-newer.json").write_text(
                json.dumps(
                    {
                        "trace_id": "trace-2",
                        "task_id": "hub-newer",
                        "status": "success",
                        "updated_at": "2026-05-18T01:01:00Z",
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )

            snapshot = MODULE.build_snapshot(repo_root, artifacts_root, "7-ARTIFACT-HUB-V2", 200)
            self.assertEqual(snapshot["open_tasks_total"], 2)

            items = snapshot["items"]
            r1 = next((x for x in items if x["ledger_task"]["task_id"] == "task-ledger-1"), None)
            self.assertIsNotNone(r1)
            self.assertEqual(r1["hub_task"]["task_id"], "hub-newer")
            self.assertEqual(r1["hub_result"]["status"], "success")

            r2 = next((x for x in items if x["ledger_task"]["task_id"] == "task-ledger-2"), None)
            self.assertIsNotNone(r2)
            self.assertIsNone(r2["hub_task"])
            self.assertIsNone(r2["hub_result"])


if __name__ == "__main__":
    unittest.main()

