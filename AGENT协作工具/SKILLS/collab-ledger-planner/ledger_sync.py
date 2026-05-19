#!/usr/bin/env python3
"""
ledger_sync.py — CLI for syncing AGENT協作工具 ledger with workspace.

Sub-commands:
  sync         Generate protocol from plan doc, write to ledger + workspace
  push-status  Sync current ledger task states to workspace PLAN.md
  status       Show current sync state (.ledger-sync.json)
"""
import argparse
import hashlib
import json
import subprocess
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


def find_repo_root(start):
    p = Path(start).resolve()
    for candidate in [p, *p.parents]:
        if (candidate / "AGENT协作工具" / "ledger" / "tasks" / "index.json").exists():
            return candidate
    raise SystemExit("error: repo_root_not_found — run from inside the repo")


def sha256_file(path):
    h = hashlib.sha256()
    h.update(Path(path).read_bytes())
    return h.hexdigest()[:12]


def load_ledger(repo_root):
    ledger_path = Path(repo_root) / "AGENT协作工具" / "ledger" / "tasks" / "index.json"
    return json.loads(ledger_path.read_text(encoding="utf-8"))


def render_plan_md(workspace, tasks, protocol_file, now):
    rows = []
    for t in tasks:
        score = t.get("score") or "—"
        pr_link = t.get("delivery_pointer") or "—"
        rows.append(
            f"| {t['task_id']} | {t['title']} | {t['status']} | {score} | {pr_link} |"
        )
    table = "\n".join(rows) if rows else "| — | — | — | — | — |"
    proto_name = Path(protocol_file).name if protocol_file else "—"
    return (
        f"# {workspace} 任务进度\n\n"
        f"> 账本协议：[{proto_name}]({protocol_file})\n"
        f"> 最后同步：{now}\n\n"
        f"| Task ID | 标题 | 状态 | 评分 | PR |\n"
        f"|---------|------|------|------|-----|\n"
        f"{table}\n\n"
        f"---\n"
        f"*此文件由 `ledger_sync.py push-status` 自动生成，请勿手动编辑。*\n"
    )


def render_ledger_sync_comment(protocol_file, changed, workspace, sha_before, sha_after, now):
    if changed:
        changes_text = "\n".join(
            f"- {c['task_id']}: {c['old_status']} -> {c['new_status']}" for c in changed
        )
    else:
        changes_text = "- (no status changes)"
    return (
        f"[账本同步 / LEDGER_SYNC]\n\n"
        f"Sync Agent: CLI (ledger_sync.py)\n"
        f"Protocol File: {protocol_file}\n"
        f"Changed Tasks:\n{changes_text}\n"
        f"Workspace Updated: {workspace}/PLAN.md\n"
        f"Ledger SHA: {sha_before} -> {sha_after}\n"
        f"Sync Time: {now}\n"
        f"状态: LEDGER_SYNC\n"
    )


def cmd_sync(args):
    repo_root = find_repo_root(Path.cwd())
    skill_dir = Path(__file__).parent
    plan_script = skill_dir / "plan_to_tasks.py"

    task_prefix = args.task_prefix or f"ahv2-{datetime.now(timezone.utc).strftime('%Y%m%d')}"
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    workspace_name = args.workspace.rstrip("/").split("/")[-1]
    protocol_filename = f"{workspace_name}-LEDGER-{date_str}.md"
    protocol_dir = repo_root / "AGENT协作工具" / "ledger" / "protocols"

    cmd = [
        sys.executable, str(plan_script),
        "--plan", args.plan,
        "--goal-id", args.goal_id,
        "--task-prefix", task_prefix,
        "--workspace-path", args.workspace,
        "--output-protocol",
        "--protocol-dir", str(protocol_dir),
    ]
    if not args.dry_run:
        cmd.append("--apply")
    else:
        cmd.append("--dry-run")

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"error: plan_to_tasks.py failed\n{result.stderr}", file=sys.stderr)
        raise SystemExit(1)

    plan_out = json.loads(result.stdout)

    workspace_dir = repo_root / args.workspace
    workspace_dir.mkdir(parents=True, exist_ok=True)
    plan_md_path = workspace_dir / "PLAN.md"
    tasks = plan_out.get("draft", plan_out).get("tasks", [])
    protocol_rel = f"../AGENT协作工具/ledger/protocols/{protocol_filename}"
    now = utc_now()

    if not args.dry_run:
        plan_md_path.write_text(
            render_plan_md(workspace_name, tasks, protocol_rel, now),
            encoding="utf-8",
        )

    sync_state_path = workspace_dir / ".ledger-sync.json"
    ledger_sha = (
        sha256_file(repo_root / "AGENT协作工具" / "ledger" / "tasks" / "index.json")
        if not args.dry_run
        else "dry-run"
    )
    sync_state = {
        "workspace": args.workspace,
        "last_sync": now,
        "trigger": "CLI sync",
        "protocol_file": f"AGENT协作工具/ledger/protocols/{protocol_filename}",
        "ledger_sha": ledger_sha,
        "task_prefix": task_prefix,
        "goal_id": args.goal_id,
    }
    if not args.dry_run:
        sync_state_path.write_text(
            json.dumps(sync_state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

    output = {
        "ok": not args.dry_run,
        "dry_run": args.dry_run,
        "protocol_file": f"AGENT协作工具/ledger/protocols/{protocol_filename}",
        "workspace_plan_md": str(plan_md_path),
        "tasks_added": len(tasks),
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))


def cmd_push_status(args):
    repo_root = find_repo_root(Path.cwd())
    workspace_dir = repo_root / args.workspace
    sync_state_path = workspace_dir / ".ledger-sync.json"

    if not sync_state_path.exists():
        raise SystemExit(
            f"error: .ledger-sync.json not found in {workspace_dir}. Run `sync` first."
        )

    sync_state = json.loads(sync_state_path.read_text(encoding="utf-8"))
    ledger = load_ledger(repo_root)

    workspace_tasks = [
        t for t in (ledger.get("tasks") or [])
        if (t.get("workspace_path") or "").rstrip("/") == args.workspace.rstrip("/")
    ]

    protocol_file = sync_state.get("protocol_file", "")
    sha_before = sync_state.get("ledger_sha", "")
    sha_after = sha256_file(
        repo_root / "AGENT协作工具" / "ledger" / "tasks" / "index.json"
    )

    workspace_name = args.workspace.rstrip("/").split("/")[-1]
    now = utc_now()
    plan_md_path = workspace_dir / "PLAN.md"

    prev_snapshot = sync_state.get("task_status_snapshot") or {}
    if not isinstance(prev_snapshot, dict):
        prev_snapshot = {}
    new_snapshot = {
        str(t.get("task_id") or ""): str(t.get("status") or "")
        for t in workspace_tasks
        if str(t.get("task_id") or "")
    }
    h = hashlib.sha256()
    h.update(
        json.dumps(new_snapshot, ensure_ascii=False, sort_keys=True).encode("utf-8")
    )
    snapshot_sha = h.hexdigest()[:12]

    changed = []
    if sha_before != sha_after:
        for tid, new_status in new_snapshot.items():
            old_status = prev_snapshot.get(tid, "?")
            if old_status != new_status:
                changed.append(
                    {"task_id": tid, "old_status": old_status, "new_status": new_status}
                )

    new_content = render_plan_md(workspace_name, workspace_tasks, protocol_file, now)

    if not args.dry_run:
        plan_md_path.write_text(new_content, encoding="utf-8")
        sync_state["last_sync"] = now
        sync_state["ledger_sha"] = sha_after
        sync_state["task_status_snapshot"] = new_snapshot
        sync_state["task_status_snapshot_sha"] = snapshot_sha
        sync_state_path.write_text(
            json.dumps(sync_state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

    comment = render_ledger_sync_comment(
        protocol_file, changed, args.workspace, sha_before, sha_after, now
    )

    output = {
        "ok": not args.dry_run,
        "dry_run": args.dry_run,
        "workspace_plan_md": str(plan_md_path),
        "tasks_synced": len(workspace_tasks),
        "changed": changed,
        "ledger_sync_comment": comment,
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))
    if args.print_comment:
        print("\n--- LEDGER_SYNC comment to post on PR ---")
        print(comment)


def cmd_status(args):
    repo_root = find_repo_root(Path.cwd())
    workspace_dir = repo_root / args.workspace
    sync_state_path = workspace_dir / ".ledger-sync.json"

    if not sync_state_path.exists():
        print(json.dumps({"synced": False, "workspace": args.workspace}))
        return

    sync_state = json.loads(sync_state_path.read_text(encoding="utf-8"))
    current_sha = sha256_file(
        repo_root / "AGENT协作工具" / "ledger" / "tasks" / "index.json"
    )
    sync_state["current_ledger_sha"] = current_sha
    sync_state["drift"] = sync_state.get("ledger_sha") != current_sha
    sync_state["synced"] = True
    print(json.dumps(sync_state, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser(
        prog="ledger_sync.py",
        description="Sync AGENT协作工具 ledger <-> workspace.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_sync = sub.add_parser("sync", help="Generate protocol from plan, write ledger + workspace")
    p_sync.add_argument("--plan", required=True)
    p_sync.add_argument("--goal-id", required=True)
    p_sync.add_argument("--task-prefix", default="")
    p_sync.add_argument("--workspace", default="7-ARTIFACT-HUB-V2")
    p_sync.add_argument("--dry-run", action="store_true")
    p_sync.set_defaults(func=cmd_sync)

    p_push = sub.add_parser("push-status", help="Sync ledger task states to workspace PLAN.md")
    p_push.add_argument("--workspace", default="7-ARTIFACT-HUB-V2")
    p_push.add_argument("--dry-run", action="store_true")
    p_push.add_argument("--print-comment", action="store_true")
    p_push.set_defaults(func=cmd_push_status)

    p_status = sub.add_parser("status", help="Show current sync state")
    p_status.add_argument("--workspace", default="7-ARTIFACT-HUB-V2")
    p_status.set_defaults(func=cmd_status)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
