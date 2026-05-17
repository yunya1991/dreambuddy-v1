import json
import sys


def evaluate_payload(payload):
    reason_codes = []
    if payload.get("exploration_present") and not payload.get("validation_decision"):
        reason_codes.append("RULE_COLLAB_VALIDATION_REQUIRED")
    if payload.get("validation_score") is not None and payload["validation_score"] < 60:
        reason_codes.append("RULE_COLLAB_SCORE_TOO_LOW")

    decision = "PASS" if not reason_codes else "BLOCK"
    return {"decision": decision, "reason_codes": reason_codes}


if __name__ == "__main__":
    payload = json.load(sys.stdin)
    json.dump(evaluate_payload(payload), sys.stdout, ensure_ascii=False, indent=2)
