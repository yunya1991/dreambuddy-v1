import json
import sys
from pathlib import Path


RULES_PATH = (
    Path(__file__).resolve().parents[1]
    / "SKILLS"
    / "agent-collab-supervisor"
    / "rules.json"
)


def load_rules():
    with RULES_PATH.open("r", encoding="utf-8") as fh:
        return json.load(fh)["rules"]


def branch_policy_valid(branch):
    return branch.startswith("agent/") or branch.startswith("milestone/")


def evaluate_payload(payload):
    rules = load_rules()
    reason_codes = []

    comments = payload.get("comments", [])
    if not payload.get("task_card_present"):
        reason_codes.append("RULE_001_TASK_CARD_REQUIRED")
    if not payload.get("design_review_present"):
        reason_codes.append("RULE_002_DESIGN_REVIEW_REQUIRED")
    if "STARTED" not in comments:
        reason_codes.append("RULE_003_STARTED_REQUIRED")
    if payload.get("scope_changed") and "UPDATED" not in comments:
        reason_codes.append("RULE_004_SCOPE_CHANGE_MUST_UPDATE")
    if payload.get("execution_blocked") and "BLOCKED" not in comments:
        reason_codes.append("RULE_005_BLOCK_MUST_ANNOUNCE")
    if not payload.get("test_report_present"):
        reason_codes.append("RULE_006_TEST_EVIDENCE_REQUIRED")
    if not payload.get("non_owner_review_present"):
        reason_codes.append("RULE_007_REVIEW_BY_NON_OWNER")
    if "DONE" not in comments:
        reason_codes.append("RULE_008_DONE_REQUIRED")
    if not branch_policy_valid(payload.get("branch", "")):
        reason_codes.append("RULE_009_BRANCH_POLICY_ENFORCED")
    if not payload.get("shared_files_declared"):
        reason_codes.append("RULE_010_SHARED_FILE_DECLARATION")

    return {
        "decision": "PASS" if not reason_codes else "BLOCK",
        "reason_codes": reason_codes,
        "evaluated_rule_count": len(rules),
    }


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: check_agent_lifecycle.py <payload.json>")

    payload_path = Path(sys.argv[1])
    with payload_path.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)

    result = evaluate_payload(payload)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(0 if result["decision"] == "PASS" else 1)


if __name__ == "__main__":
    main()
