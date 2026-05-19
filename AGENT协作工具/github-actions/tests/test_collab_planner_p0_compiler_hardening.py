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

PLAN_TO_TASKS_PATH = SKILL_ROOT / "plan_to_tasks.py"
PLAN_TO_TASKS_SPEC = importlib.util.spec_from_file_location(
    "plan_to_tasks", PLAN_TO_TASKS_PATH
)
PLAN_TO_TASKS = importlib.util.module_from_spec(PLAN_TO_TASKS_SPEC)
PLAN_TO_TASKS_SPEC.loader.exec_module(PLAN_TO_TASKS)

LEDGER_SYNC_PATH = SKILL_ROOT / "ledger_sync.py"
LEDGER_SYNC_SPEC = importlib.util.spec_from_file_location("ledger_sync", LEDGER_SYNC_PATH)
LEDGER_SYNC = importlib.util.module_from_spec(LEDGER_SYNC_SPEC)
LEDGER_SYNC_SPEC.loader.exec_module(LEDGER_SYNC)


class CollabPlannerP0CompilerHardeningTests(unittest.TestCase):
    def test_plan_to_tasks_supports_validate_mode(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            plan_path = root / "plan.md"
            plan_path.write_text(
                "\n".join(
                    [
                        "---",
                        "goal_id: goal-x",
                        "workspace: WS",
                        "task_prefix: tp",
                        "acceptance_required: true",
                        "---",
                        "",
                        "# Plan Title",
                        "- Task A",
                    ]
                ),
                encoding="utf-8",
            )

            args = type(
                "Args",
                (),
                {
                    "plan": str(plan_path),
                    "goal_id": "",
                    "task_prefix": "",
                    "workspace_path": "",
                    "apply": False,
                    "output_protocol": False,
                    "protocol_dir": "",
                    "dry_run": False,
                    "validate": True,
                },
            )()

            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                PLAN_TO_TASKS.run(args)
            out = json.loads(buf.getvalue())
            self.assertTrue(out.get("ok"))
            self.assertTrue(out.get("validated"))

    def test_protocol_history_records_supersedes_chain(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            protocol_dir = root / "protocols"
            protocol_dir.mkdir(parents=True, exist_ok=True)
            plan_path = root / "plan.md"
            plan_path.write_text(
                "\n".join(
                    [
                        "---",
                        "goal_id: goal-x",
                        "workspace: WS",
                        "task_prefix: tp",
                        "---",
                        "",
                        "# Plan Title",
                        "- Task A",
                    ]
                )
                + "\n",
                encoding="utf-8",
            )

            args = type(
                "Args",
                (),
                {
                    "plan": str(plan_path),
                    "goal_id": "",
                    "task_prefix": "",
                    "workspace_path": "",
                    "apply": False,
                    "output_protocol": True,
                    "protocol_dir": str(protocol_dir),
                    "dry_run": False,
                    "validate": False,
                },
            )()

            buf1 = io.StringIO()
            with contextlib.redirect_stdout(buf1):
                PLAN_TO_TASKS.run(args)
            out1 = json.loads(buf1.getvalue())
            self.assertIn("protocol_written", out1)
            protocol_path = Path(out1["protocol_written"])
            self.assertTrue(protocol_path.exists())

            plan_path.write_text(plan_path.read_text(encoding="utf-8") + "\n- Task B\n", encoding="utf-8")

            buf2 = io.StringIO()
            with contextlib.redirect_stdout(buf2):
                PLAN_TO_TASKS.run(args)
            out2 = json.loads(buf2.getvalue())
            self.assertIn("protocol_written", out2)

            history_path = protocol_path.with_suffix(".history.jsonl")
            self.assertTrue(history_path.exists())
            lines = [ln for ln in history_path.read_text(encoding="utf-8").splitlines() if ln.strip()]
            self.assertEqual(len(lines), 2)
            r1 = json.loads(lines[0])
            r2 = json.loads(lines[1])
            self.assertTrue(r1.get("compile_id"))
            self.assertEqual(r2.get("supersedes_compile_id"), r1.get("compile_id"))

    def test_push_status_outputs_real_diff_when_snapshot_present(self):
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
                                "status": "accepted",
                                "workspace_path": "WS",
                            }
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
                        "task_status_snapshot": {"task-x-0": "planned"},
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
                changed = out.get("changed") or []
                self.assertEqual(len(changed), 1)
                self.assertEqual(changed[0]["old_status"], "planned")
                self.assertEqual(changed[0]["new_status"], "accepted")
            finally:
                os.chdir(prev)

    def test_push_status_persists_snapshot_hash(self):
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
                            }
                        ],
                    },
                    ensure_ascii=False,
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )

            (root / "WS").mkdir(parents=True, exist_ok=True)
            sync_path = root / "WS" / ".ledger-sync.json"
            sync_path.write_text(
                json.dumps(
                    {
                        "workspace": "WS",
                        "last_sync": "2026-05-18T00:00:00Z",
                        "trigger": "CLI sync",
                        "protocol_file": "AGENT协作工具/ledger/protocols/WS-LEDGER-20260518.md",
                        "ledger_sha": "force-drift",
                        "task_prefix": "x",
                        "goal_id": "goal-x",
                        "task_status_snapshot": {"task-x-0": "planned"},
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
                LEDGER_SYNC.cmd_push_status(
                    type(
                        "Args",
                        (),
                        {
                            "workspace": "WS",
                            "dry_run": False,
                            "print_comment": False,
                        },
                    )()
                )
                persisted = json.loads(sync_path.read_text(encoding="utf-8"))
                self.assertTrue(persisted.get("task_status_snapshot_sha"))
            finally:
                os.chdir(prev)


if __name__ == "__main__":
    unittest.main()
