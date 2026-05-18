import json
import sys


def extract_field(text, field_name):
    prefix = f"{field_name}:"
    for line in text.splitlines():
        if line.startswith(prefix):
            return line[len(prefix) :].strip()
    return ""


def safe_int(value: str):
    if value is None:
        return None
    stripped = str(value).strip()
    if not stripped:
        return None
    if stripped.isdigit():
        return int(stripped)
    return None


def last_comment_with_prefix(comments, prefix):
    matched = [comment for comment in comments if comment.startswith(prefix)]
    return matched[-1] if matched else ""


def handoff_to_requested_status(handoff):
    mapping = {
        "ledgered": "ledgered",
        "archived": "archived",
        "knowledge_synced": "knowledge_synced",
        "knowledge_synced pending": "knowledge_synced",
    }
    return mapping.get(handoff.strip(), "")


def build_payload(raw):
    comments = raw.get("comments", [])
    latest_started = last_comment_with_prefix(comments, "[协作开工声明 / STARTED]")
    latest_exploration = last_comment_with_prefix(
        comments, "[探索提案 / EXPLORATION_PROPOSAL]"
    )
    latest_validation = last_comment_with_prefix(
        comments, "[验证结论 / VALIDATION_RESULT]"
    )
    latest_ledger_entry = last_comment_with_prefix(comments, "[账本记账 / LEDGER_ENTRY]")
    score = extract_field(latest_validation, "Score")
    handoff = extract_field(latest_validation, "Governance Handoff")

    return {
        "branch": raw.get("branch", ""),
        "task_id": extract_field(latest_started, "Task ID")
        or extract_field(latest_ledger_entry, "Task ID"),
        "exploration_present": bool(latest_exploration),
        "validation_present": bool(latest_validation),
        "ledger_entry_present": bool(latest_ledger_entry),
        "validation_decision": extract_field(latest_validation, "Decision"),
        "validation_score": safe_int(score),
        "governance_agent": extract_field(latest_started, "Governance Agent"),
        "task_type": extract_field(latest_started, "Task Type"),
        "dependency_gate": extract_field(latest_started, "Dependency Gate"),
        "current_sync_state": extract_field(latest_started, "Current Sync State"),
        "next_required_action": extract_field(latest_started, "Next Required Action"),
        "recommended_next_action": extract_field(latest_started, "Next Required Action"),
        "governance_handoff": handoff,
        "requested_status": handoff_to_requested_status(handoff),
    }


if __name__ == "__main__":
    raw = json.load(sys.stdin)
    json.dump(build_payload(raw), sys.stdout, ensure_ascii=False, indent=2)
