import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path


OPEN_STATUSES = {"planned", "open", "accepted", "rework", "blocked"}


def utc_now():
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def read_json_file(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json_file(path: Path, data: dict):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def compute_open_tasks(task_index: dict) -> list[str]:
    task_ids = []
    for task in task_index.get("tasks", []):
        status = (task.get("status") or "").strip().casefold()
        if status in OPEN_STATUSES:
            task_id = (task.get("task_id") or "").strip()
            if task_id:
                task_ids.append(task_id)
    return task_ids


def promote_tasks(
    *,
    repo_root: Path,
    task_ids: list[str],
    workspace_path: str,
    to_status: str,
    next_required_action: str | None,
    sync_checkpoint: list[str],
):
    if to_status != "accepted":
        raise ValueError("unsupported_to_status")

    normalized_ids = [str(x or "").strip() for x in task_ids if str(x or "").strip()]
    if not normalized_ids:
        raise ValueError("missing_task_ids")

    ws = str(workspace_path or "").strip()
    if not ws:
        raise ValueError("missing_workspace_path")

    nra = (next_required_action or "").strip()
    scp = [str(x or "").strip() for x in (sync_checkpoint or []) if str(x or "").strip()]
    if not nra and not scp:
        raise ValueError("missing_acceptance_checklist")

    ledger_path = repo_root / "AGENT协作工具" / "ledger" / "tasks" / "index.json"
    data = read_json_file(ledger_path)

    tasks = data.get("tasks") or []
    by_id = {str(t.get("task_id") or "").strip(): t for t in tasks if isinstance(t, dict)}

    for tid in normalized_ids:
        if tid not in by_id:
            raise ValueError(f"task_not_found:{tid}")
        t = by_id[tid]
        if str(t.get("workspace_path") or "").strip() != ws:
            raise ValueError(f"workspace_mismatch:{tid}")
        current = (t.get("status") or "").strip().casefold()
        if current != "planned":
            raise ValueError(f"invalid_transition:{tid}:{current}->accepted")

    for tid in normalized_ids:
        t = by_id[tid]
        t["status"] = "accepted"
        if nra:
            t["next_required_action"] = nra
        if scp:
            cur = [str(x or "").strip() for x in (t.get("sync_checkpoint") or []) if str(x or "").strip()]
            for x in scp:
                if x not in cur:
                    cur.append(x)
            t["sync_checkpoint"] = cur

    data["generated_at"] = utc_now()
    data["open_tasks"] = compute_open_tasks(data)
    write_json_file(ledger_path, data)

    return {"ok": True, "promoted": normalized_ids, "to_status": "accepted", "ledger_path": str(ledger_path)}


def find_repo_root(start: Path) -> Path:
    p = start.resolve()
    for candidate in [p, *p.parents]:
        if (candidate / "AGENT协作工具" / "ledger" / "tasks" / "index.json").exists():
            return candidate
    raise SystemExit("repo_root_not_found")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", default=os.environ.get("REPO_ROOT", "").strip() or None)
    parser.add_argument("--workspace-path", default=os.environ.get("WORKSPACE_PATH", "7-ARTIFACT-HUB-V2"))
    parser.add_argument("--to", dest="to_status", default="accepted")
    parser.add_argument("--task-id", action="append", default=[])
    parser.add_argument("--next-required-action", default=os.environ.get("NEXT_REQUIRED_ACTION", "").strip() or None)
    parser.add_argument("--sync-checkpoint", action="append", default=[])
    args = parser.parse_args()

    repo_root = Path(args.repo_root).expanduser().resolve() if args.repo_root else find_repo_root(Path.cwd())
    result = promote_tasks(
        repo_root=repo_root,
        task_ids=args.task_id,
        workspace_path=args.workspace_path,
        to_status=args.to_status,
        next_required_action=args.next_required_action,
        sync_checkpoint=args.sync_checkpoint,
    )
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()

