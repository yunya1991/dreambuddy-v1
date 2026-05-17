import json
import sys


def extract_field(text, field_name):
    prefix = f"{field_name}:"
    for line in text.splitlines():
        if line.startswith(prefix):
            return line[len(prefix) :].strip()
    return ""


def build_payload(raw):
    comments = raw.get("comments", [])
    exploration_comments = [
        comment
        for comment in comments
        if comment.startswith("[探索提案 / EXPLORATION_PROPOSAL]")
    ]
    validation_comments = [
        comment
        for comment in comments
        if comment.startswith("[验证结论 / VALIDATION_RESULT]")
    ]
    latest_validation = validation_comments[-1] if validation_comments else ""
    score = extract_field(latest_validation, "Score")

    return {
        "branch": raw.get("branch", ""),
        "exploration_present": bool(exploration_comments),
        "validation_decision": extract_field(latest_validation, "Decision"),
        "validation_score": int(score) if score else None,
    }


if __name__ == "__main__":
    raw = json.load(sys.stdin)
    json.dump(build_payload(raw), sys.stdout, ensure_ascii=False, indent=2)
