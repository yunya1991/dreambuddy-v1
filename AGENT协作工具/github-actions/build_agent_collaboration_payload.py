import json
import sys


def extract_field(text, field_name):
    prefix = f"{field_name}:"
    for line in text.splitlines():
        if line.startswith(prefix):
            return line[len(prefix) :].strip()
    return ""


def last_comment_with_prefix(comments, prefix):
    matched = [comment for comment in comments if comment.startswith(prefix)]
    return matched[-1] if matched else ""


def build_payload(raw):
    comments = raw.get("comments", [])
    latest_started = last_comment_with_prefix(comments, "[协作开工声明 / STARTED]")
    latest_exploration = last_comment_with_prefix(
        comments, "[探索提案 / EXPLORATION_PROPOSAL]"
    )
    latest_validation = last_comment_with_prefix(
        comments, "[验证结论 / VALIDATION_RESULT]"
    )
    score = extract_field(latest_validation, "Score")

    return {
        "branch": raw.get("branch", ""),
        "exploration_present": bool(latest_exploration),
        "validation_decision": extract_field(latest_validation, "Decision"),
        "validation_score": int(score) if score else None,
        "governance_agent": extract_field(latest_started, "Governance Agent"),
        "task_type": extract_field(latest_started, "Task Type"),
        "dependency_gate": extract_field(latest_started, "Dependency Gate"),
        "current_sync_state": extract_field(latest_started, "Current Sync State"),
        "next_required_action": extract_field(latest_started, "Next Required Action"),
        "governance_handoff": extract_field(latest_validation, "Governance Handoff"),
    }


if __name__ == "__main__":
    raw = json.load(sys.stdin)
    json.dump(build_payload(raw), sys.stdout, ensure_ascii=False, indent=2)
