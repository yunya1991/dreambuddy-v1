import re
import unittest
from pathlib import Path


TOOL_ROOT = Path(__file__).resolve().parents[2]
DOCS_README = TOOL_ROOT / "docs" / "README.md"
TOOL_README = TOOL_ROOT / "README.md"


class DocsEntrypointReadmeTests(unittest.TestCase):
    def test_governance_cycle_plan_is_linked_in_entrypoints(self):
        pattern = re.compile(
            r"\[[^\]]*governance-cycle-implementation-plan\.md[^\]]*\]\([^)]+governance-cycle-implementation-plan\.md\)",
            re.IGNORECASE,
        )
        for path in (DOCS_README, TOOL_README):
            text = path.read_text(encoding="utf-8")
            self.assertRegex(text, pattern, str(path))


if __name__ == "__main__":
    unittest.main()
