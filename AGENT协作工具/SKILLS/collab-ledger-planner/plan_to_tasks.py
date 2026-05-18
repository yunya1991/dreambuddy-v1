import argparse
import json
import re
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


def empty_governance_closure():
    return {
        "archive_summary": "",
        "index_updates": [],
        "faq_decision": "",
        "faq_entries": [],
        "rollup_effect": "",
        "followup_tasks": [],
        "closure_agent": "",
        "closure_completed_at": "",
    }


def make_task(
    *,
    goal_id: str,
    task_id: str,
    parent_task_id: str,
    title: str,
    source_type: str,
    task_type: str,
    status: str,
    workspace_path: str,
):
    return {
        "goal_id": goal_id,
        "task_id": task_id,
        "parent_task_id": parent_task_id,
        "title": title,
        "source_type": source_type,
        "task_type": task_type,
        "mode": "PHASE_BROADCAST",
        "status": status,
        "depends_on": [],
        "dependency_gate": "none",
        "shared_boundary": [],
        "sync_checkpoint": [],
        "current_sync_state": "none",
        "owner_agent": "",
        "validator_agent": "Validator AGENT",
        "governance_agent": "Governance AGENT",
        "exclusive_owner_agent": "",
        "exclusive_until": "",
        "branch": "",
        "workspace_path": workspace_path,
        "claim_pointer": "",
        "delivery_pointer": "",
        "validation_pointer": "",
        "score": None,
        "reward": None,
        "final_credit_agent": "",
        "archived_at": "",
        "knowledge_synced_at": "",
        "next_required_action": "",
        "governance_closure": empty_governance_closure(),
    }


def parse_plan_markdown(text: str):
    title = ""
    phases: list[dict] = []
    current_phase = None

    for raw in text.splitlines():
        line = raw.rstrip("\n")
        if not title:
            m = re.match(r"^#\s+(.+)$", line.strip())
            if m:
                title = m.group(1).strip()
                continue

        m2 = re.match(r"^##\s+(.+)$", line.strip())
        if m2:
            current_phase = {"title": m2.group(1).strip(), "items": []}
            phases.append(current_phase)
            continue

        m3 = re.match(r"^\s*-\s+(?:\[\s*\]\s+)?(.+)$", line)
        if m3:
            item = m3.group(1).strip()
            if not item:
                continue
            if current_phase is None:
                current_phase = {"title": "", "items": []}
                phases.append(current_phase)
            current_phase["items"].append(item)

    return {"title": title, "phases": phases}


def generate_tasks(*, goal_id: str, task_prefix: str, workspace_path: str, plan_text: str):
    parsed = parse_plan_markdown(plan_text)
    root_title = parsed["title"] or f"Plan: {task_prefix}"
    phases = parsed["phases"]

    tasks = []
    used = set()

    def next_id(n: int) -> str:
        return f"task-{task_prefix}-{n}"

    def reserve(tid: str):
        if tid in used:
            raise ValueError(f"task_id_conflict:{tid}")
        used.add(tid)

    reserve(next_id(0))
    root_id = next_id(0)
    tasks.append(
        make_task(
            goal_id=goal_id,
            task_id=root_id,
            parent_task_id="",
            title=root_title,
            source_type="assigned",
            task_type="serial",
            status="planned",
            workspace_path=workspace_path,
        )
    )

    counter = 1
    for phase in phases:
        phase_title = (phase.get("title") or "").strip()
        items = phase.get("items") or []
        parent_id = root_id

        if phase_title:
            reserve(next_id(counter))
            phase_id = next_id(counter)
            counter += 1
            tasks.append(
                make_task(
                    goal_id=goal_id,
                    task_id=phase_id,
                    parent_task_id=root_id,
                    title=phase_title,
                    source_type="derived",
                    task_type="serial",
                    status="planned",
                    workspace_path=workspace_path,
                )
            )
            parent_id = phase_id

        for item in items:
            reserve(next_id(counter))
            tid = next_id(counter)
            counter += 1
            tasks.append(
                make_task(
                    goal_id=goal_id,
                    task_id=tid,
                    parent_task_id=parent_id,
                    title=item,
                    source_type="derived",
                    task_type="parallel",
                    status="planned",
                    workspace_path=workspace_path,
                )
            )

    open_tasks = [t["task_id"] for t in tasks if t["status"] in OPEN_STATUSES]
    return {"tasks": tasks, "open_tasks": open_tasks}


def find_repo_root(start: Path) -> Path:
    p = start.resolve()
    for candidate in [p, *p.parents]:
        if (candidate / "AGENT协作工具" / "ledger" / "tasks" / "index.json").exists():
            return candidate
    raise SystemExit("repo_root_not_found")


def apply_to_ledger(repo_root: Path, plan_out: dict):
    ledger_path = repo_root / "AGENT协作工具" / "ledger" / "tasks" / "index.json"
    existing = json.loads(ledger_path.read_text(encoding="utf-8"))
    existing_tasks = [t for t in (existing.get("tasks") or []) if isinstance(t, dict)]
    existing_ids = {str(t.get("task_id") or "").strip() for t in existing_tasks if str(t.get("task_id") or "").strip()}

    for t in plan_out["tasks"]:
        if t["task_id"] in existing_ids:
            raise SystemExit(f"task_id_conflict:{t['task_id']}")

    existing["tasks"] = existing_tasks + plan_out["tasks"]

    open_ids = [str(x or "").strip() for x in (existing.get("open_tasks") or []) if str(x or "").strip()]
    for tid in plan_out["open_tasks"]:
        if tid not in open_ids:
            open_ids.append(tid)
    existing["open_tasks"] = open_ids

    existing["generated_at"] = utc_now()
    ledger_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"written": str(ledger_path), "added": len(plan_out["tasks"])}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan", required=True)
    parser.add_argument("--goal-id", required=True)
    parser.add_argument("--task-prefix", required=True)
    parser.add_argument("--workspace-path", required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    plan_path = Path(args.plan)
    plan_text = plan_path.read_text(encoding="utf-8")
    out = generate_tasks(
        goal_id=args.goal_id,
        task_prefix=args.task_prefix,
        workspace_path=args.workspace_path,
        plan_text=plan_text,
    )

    payload = {
        "version": 1,
        "generated_at": utc_now(),
        "open_tasks": out["open_tasks"],
        "tasks": out["tasks"],
    }

    if args.apply:
        repo_root = find_repo_root(Path.cwd())
        applied = apply_to_ledger(repo_root, out)
        payload = {"ok": True, "applied": applied, "draft": payload}

    print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()

