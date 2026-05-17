import json
import sys


ALLOWED_TRANSITIONS = {
    "accepted": {"ledgered"},
    "ledgered": {"archived"},
    "archived": {"knowledge_synced"},
}


def evaluate_payload(payload):
    reason_codes = []
    recommended_next_action = ""
    if payload.get("exploration_present") and not payload.get("validation_decision"):
        reason_codes.append("RULE_COLLAB_VALIDATION_REQUIRED")
        if not recommended_next_action:
            recommended_next_action = "validator: publish validation result"
    if payload.get("validation_score") is not None and payload["validation_score"] < 60:
        reason_codes.append("RULE_COLLAB_SCORE_TOO_LOW")
        if not recommended_next_action:
            recommended_next_action = "developer: rework before ledger write"

    current_status = payload.get("current_status")
    requested_status = payload.get("requested_status")
    is_noop = bool(current_status) and bool(requested_status) and current_status == requested_status
    if current_status and requested_status and not is_noop:
        allowed = ALLOWED_TRANSITIONS.get(current_status, set())
        if requested_status not in allowed:
            reason_codes.append("RULE_INVALID_STATUS_TRANSITION")
            if not recommended_next_action:
                recommended_next_action = "governance: adjust requested status"

    if (
        not is_noop
        and payload.get("task_type") == "serial"
        and not payload.get("dependency_satisfied", True)
    ):
        reason_codes.append("RULE_DEPENDENCY_NOT_SATISFIED")
        if not recommended_next_action:
            recommended_next_action = "developer: satisfy dependency gate"

    if (
        not is_noop
        and
        payload.get("task_type") == "shared-sync"
        and payload.get("current_sync_state") == "pending"
        and not payload.get("sync_review_present", False)
    ):
        reason_codes.append("RULE_SYNC_REVIEW_REQUIRED")
        if not recommended_next_action:
            recommended_next_action = "governance: add sync review evidence"

    decision = "PASS" if not reason_codes else "BLOCK"
    return {
        "decision": decision,
        "reason_codes": reason_codes,
        "recommended_next_action": recommended_next_action,
    }


if __name__ == "__main__":
    payload = json.load(sys.stdin)
    json.dump(evaluate_payload(payload), sys.stdout, ensure_ascii=False, indent=2)
