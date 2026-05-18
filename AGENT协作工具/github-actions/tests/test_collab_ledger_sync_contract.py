import contextlib
import importlib.util
import io
import json
import os
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
SKILL_ROOT = REPO_ROOT / "AGENT协作工具" / "SKILLS" / "collab-ledger-planner"
LEDGER_SYNC_PATH = SKILL_ROOT / "ledger_sync.py"
LEDGER_SYNC_SPEC = importlib.util.spec_from_file_location("ledger_sync", LEDGER_SYNC_PATH)
LEDGER_SYNC = importlib.util.module_from_spec(LEDGER_SYNC_SPEC)
LEDGER_SYNC_SPEC.loader.exec_module(LEDGER_SYNC)


class CollabLedgerSyncContractTests(unittest.TestCase):
    def test_workflow_consumes_pure_json(self):
        workflow = (REPO_ROOT / ".github" / "workflows" / "collab-ledger-sync.yml").read_text(
            encoding="utf-8"
        )
        self.assertIn("glob('**/.ledger-sync.json')", workflow)
        self.assertNotIn("--print-comment", workflow)
        self.assertIn("ledger_sync_comment", workflow)

    def test_push_status_outputs_ledger_sync_comment(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "AGENT协作工具" / "ledger" / "tasks").mkdir(parents=True, exist_ok=True)
            (root / "AGENT协作工具" / "ledger" / "tasks" / "index.json").write_text(
                json.dumps(
                    {
                        "version": 1,
                        "generated_at": "2026-05-18T00:00:00Z",
                        "open_tasks": [],
                        "tasks": [
                            {
                                "task_id": "task-x-0",
                                "title": "T0",
                                "status": "planned",
                                "workspace_path": "WS",
                            },
                            {
                                "task_id": "task-x-1",
                                "title": "T1",
                                "status": "ledgered",
                                "workspace_path": "WS",
                            },
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )

            (root / "WS").mkdir(parents=True, exist_ok=True)
            (root / "WS" / ".ledger-sync.json").write_text(
                json.dumps(
                    {
                        "workspace": "WS",
                        "last_sync": "2026-05-18T00:00:00Z",
                        "trigger": "CLI sync",
                        "protocol_file": "AGENT协作工具/ledger/protocols/WS-LEDGER-20260518.md",
                        "ledger_sha": "force-drift",
                        "task_prefix": "x",
                        "goal_id": "goal-x",
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )

            prev = os.getcwd()
            try:
                os.chdir(root)
                buf = io.StringIO()
                with contextlib.redirect_stdout(buf):
                    LEDGER_SYNC.cmd_push_status(
                        type(
                            "Args",
                            (),
                            {
                                "workspace": "WS",
                                "dry_run": True,
                                "print_comment": False,
                            },
                        )()
                    )
                out = json.loads(buf.getvalue())
                self.assertIn("ledger_sync_comment", out)
                self.assertIn("[账本同步 / LEDGER_SYNC]", out["ledger_sync_comment"])
            finally:
                os.chdir(prev)


if __name__ == "__main__":
    unittest.main()

