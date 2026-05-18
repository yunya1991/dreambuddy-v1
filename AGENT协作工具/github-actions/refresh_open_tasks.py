import json
import sys
from datetime import datetime, timezone
from pathlib import Path


def utc_now():
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def compute_open_tasks(task_index):
    open_statuses = {"planned", "open", "accepted", "rework", "blocked"}
    task_ids = []
    for task in task_index.get("tasks", []):
        status = (task.get("status") or "").strip().casefold()
        if status in open_statuses:
            task_id = (task.get("task_id") or "").strip()
            if task_id:
                task_ids.append(task_id)
    return task_ids


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: refresh_open_tasks.py <tasks_index.json>")
    path = Path(sys.argv[1])
    task_index = json.loads(path.read_text(encoding="utf-8"))
    expected = compute_open_tasks(task_index)
    current = task_index.get("open_tasks", [])
    if current == expected:
        print(json.dumps({"changed": False, "open_tasks": expected}, ensure_ascii=False))
        return
    task_index["open_tasks"] = expected
    task_index["generated_at"] = utc_now()
    path.write_text(json.dumps(task_index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"changed": True, "open_tasks": expected}, ensure_ascii=False))


if __name__ == "__main__":
    main()

