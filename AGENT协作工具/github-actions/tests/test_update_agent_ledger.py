import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class LedgerSeedShapeTests(unittest.TestCase):
    def test_task_index_has_required_top_level_keys(self):
        data = json.loads(
            (ROOT / "ledger" / "tasks" / "index.json").read_text(encoding="utf-8")
        )
        self.assertEqual(
            sorted(data.keys()),
            ["generated_at", "open_tasks", "tasks", "version"],
        )


if __name__ == "__main__":
    unittest.main()
