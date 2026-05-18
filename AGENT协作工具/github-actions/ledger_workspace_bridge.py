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


def parse_iso_ts(value: str) -> float:
    if not value:
        return 0.0
    raw = str(value).strip()
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(raw).timestamp()
    except Exception:
        return 0.0


def read_json_file(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def compute_open_task_set(index: dict, tasks: list[dict]) -> set[str]:
    explicit = [str(x or "").strip() for x in (index.get("open_tasks") or []) if str(x or "").strip()]
    if explicit:
        return set(explicit)
    out = []
    for t in tasks:
        status = str(t.get("status") or "").strip().casefold()
        if status in OPEN_STATUSES:
            tid = str(t.get("task_id") or "").strip()
            if tid:
                out.append(tid)
    return set(out)


def load_latest_hub_tasks_by_ledger_task_id(artifacts_root: Path) -> dict[str, dict]:
    tasks_dir = artifacts_root / "tasks"
    if not tasks_dir.exists():
        return {}

    out: dict[str, dict] = {}
    for p in tasks_dir.iterdir():
        if not p.is_file() or not p.name.startswith("task_") or not p.name.endswith(".json"):
            continue
        parsed = read_json_file(p, None)
        if not isinstance(parsed, dict):
            continue
        ledger_task_id = str(parsed.get("ledger_task_id") or "").strip()
        if not ledger_task_id:
            continue
        task_id = str(parsed.get("task_id") or "").strip()
        trace_id = str(parsed.get("trace_id") or "").strip()
        created_at = str(parsed.get("created_at") or "").strip()
        if not task_id or not trace_id or not created_at:
            continue
        candidate = {
            "task_id": task_id,
            "trace_id": trace_id,
            "created_at": created_at,
            "ledger_task_id": ledger_task_id,
        }
        current = out.get(ledger_task_id)
        if not current or parse_iso_ts(candidate["created_at"]) > parse_iso_ts(str(current.get("created_at") or "")):
            out[ledger_task_id] = candidate
    return out


def load_latest_hub_results_by_task_id(artifacts_root: Path) -> dict[str, dict]:
    results_dir = artifacts_root / "results"
    if not results_dir.exists():
        return {}

    out: dict[str, dict] = {}
    for p in results_dir.iterdir():
        if not p.is_file() or not p.name.startswith("result_") or not p.name.endswith(".json"):
            continue
        parsed = read_json_file(p, None)
        if not isinstance(parsed, dict):
            continue
        task_id = str(parsed.get("task_id") or "").strip()
        trace_id = str(parsed.get("trace_id") or "").strip()
        status = str(parsed.get("status") or "").strip()
        if not task_id or not trace_id or not status:
            continue
        candidate = {
            "task_id": task_id,
            "trace_id": trace_id,
            "status": status,
            "created_at": parsed.get("created_at") if isinstance(parsed.get("created_at"), str) else None,
            "updated_at": parsed.get("updated_at") if isinstance(parsed.get("updated_at"), str) else None,
        }
        current = out.get(task_id)
        if not current:
            out[task_id] = candidate
            continue
        candidate_ts = parse_iso_ts(candidate.get("updated_at") or candidate.get("created_at") or "")
        current_ts = parse_iso_ts(str(current.get("updated_at") or current.get("created_at") or ""))
        if candidate_ts > current_ts:
            out[task_id] = candidate
    return out


def build_snapshot(repo_root: Path, artifacts_root: Path, workspace_path: str, limit: int):
    ledger_index_path = repo_root / "AGENT协作工具" / "ledger" / "tasks" / "index.json"
    ledger_index = read_json_file(ledger_index_path, {"open_tasks": [], "tasks": []})
    tasks = [t for t in (ledger_index.get("tasks") or []) if isinstance(t, dict)]
    workspace_tasks = [t for t in tasks if str(t.get("workspace_path") or "").strip() == workspace_path]
    open_set = compute_open_task_set(ledger_index, workspace_tasks)
    open_tasks = [t for t in workspace_tasks if str(t.get("task_id") or "").strip() in open_set][:limit]

    latest_hub_task_by_ledger = load_latest_hub_tasks_by_ledger_task_id(artifacts_root)
    latest_hub_result_by_task = load_latest_hub_results_by_task_id(artifacts_root)

    items = []
    for t in open_tasks:
        tid = str(t.get("task_id") or "").strip()
        hub_task = latest_hub_task_by_ledger.get(tid)
        hub_result = latest_hub_result_by_task.get(hub_task["task_id"]) if hub_task else None
        items.append({"ledger_task": t, "hub_task": hub_task, "hub_result": hub_result})

    return {
        "generated_at": utc_now(),
        "workspace_path": workspace_path,
        "open_tasks_total": len(items),
        "items": items,
    }


def find_repo_root(start: Path) -> Path:
    p = start.resolve()
    for candidate in [p, *p.parents]:
        if (candidate / "AGENT协作工具" / "ledger" / "tasks" / "index.json").exists():
            return candidate
    raise SystemExit("repo_root_not_found")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", default=os.environ.get("REPO_ROOT", "").strip() or None)
    parser.add_argument("--artifacts-root", default=os.environ.get("ARTIFACTS_ROOT", "").strip() or None)
    parser.add_argument("--workspace-path", default=os.environ.get("WORKSPACE_PATH", "7-ARTIFACT-HUB-V2"))
    parser.add_argument("--limit", default=os.environ.get("LIMIT", "200"))
    args = parser.parse_args()

    repo_root = Path(args.repo_root).expanduser().resolve() if args.repo_root else find_repo_root(Path.cwd())
    if args.artifacts_root:
        artifacts_root = Path(args.artifacts_root).expanduser().resolve()
    else:
        artifacts_root = (repo_root / "dreambuddy" / "artifacts").resolve()

    try:
        limit = int(args.limit)
    except Exception:
        limit = 200
    limit = max(0, limit)

    workspace_path = str(args.workspace_path or "").strip()
    if not workspace_path:
        raise SystemExit("missing_workspace_path")

    snapshot = build_snapshot(repo_root, artifacts_root, workspace_path, limit)
    print(json.dumps(snapshot, ensure_ascii=False))


if __name__ == "__main__":
    main()

