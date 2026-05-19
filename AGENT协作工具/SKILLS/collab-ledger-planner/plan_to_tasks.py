import argparse
import json
import re
import hashlib
from datetime import datetime, timezone
from pathlib import Path


OPEN_STATUSES = {"planned", "open", "accepted", "rework", "blocked"}
LEDGER_SCHEMA_VERSION = "ledger/tasks/index.json@v1"


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
    goal_id,
    task_id,
    parent_task_id,
    title,
    source_type,
    task_type,
    status,
    workspace_path,
    next_required_action="",
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
        "next_required_action": next_required_action,
        "governance_closure": empty_governance_closure(),
    }


def slugify(text, maxlen=20):
    """Convert title to a short kebab-case slug for task_id."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text[:maxlen].rstrip("-")


def parse_plan_markdown(text):
    title = ""
    phases = []
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


def parse_frontmatter(text: str):
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, text
    meta_lines = []
    i = 1
    while i < len(lines):
        if lines[i].strip() == "---":
            i += 1
            break
        meta_lines.append(lines[i])
        i += 1
    meta = {}
    for raw in meta_lines:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        key = k.strip()
        value = v.strip()
        lowered = value.casefold()
        if lowered in {"true", "yes", "y", "1"}:
            meta[key] = True
        elif lowered in {"false", "no", "n", "0"}:
            meta[key] = False
        else:
            meta[key] = value
    rest = "\n".join(lines[i:]) + ("\n" if text.endswith("\n") else "")
    return meta, rest


def sha256_text(text: str):
    h = hashlib.sha256()
    h.update(text.encode("utf-8"))
    return h.hexdigest()[:12]


def generate_tasks(*, goal_id, task_prefix, workspace_path, plan_text):
    parsed = parse_plan_markdown(plan_text)
    root_title = parsed["title"] or f"Plan: {task_prefix}"
    phases = parsed["phases"]

    tasks = []
    used = set()
    counter = [0]

    def next_id(slug=""):
        n = counter[0]
        counter[0] += 1
        if slug:
            return f"task-{task_prefix}-{slug}-{n}"
        return f"task-{task_prefix}-{n}"

    def reserve(tid):
        if tid in used:
            raise ValueError(f"task_id_conflict:{tid}")
        used.add(tid)
        return tid

    root_slug = slugify(root_title)
    root_id = reserve(next_id(root_slug))
    tasks.append(make_task(
        goal_id=goal_id, task_id=root_id, parent_task_id="",
        title=root_title, source_type="assigned", task_type="serial",
        status="planned", workspace_path=workspace_path,
        next_required_action="governance: review scope and open child tasks for claiming",
    ))

    for phase in phases:
        phase_title = (phase.get("title") or "").strip()
        items = phase.get("items") or []
        parent_id = root_id

        if phase_title:
            phase_slug = slugify(phase_title)
            phase_id = reserve(next_id(phase_slug))
            tasks.append(make_task(
                goal_id=goal_id, task_id=phase_id, parent_task_id=root_id,
                title=phase_title, source_type="derived", task_type="serial",
                status="planned", workspace_path=workspace_path,
                next_required_action="developer: claim and implement child tasks in parallel; governance: monitor phase completion",
            ))
            parent_id = phase_id

        for item in items:
            item_slug = slugify(item)
            tid = reserve(next_id(item_slug))
            tasks.append(make_task(
                goal_id=goal_id, task_id=tid, parent_task_id=parent_id,
                title=item, source_type="derived", task_type="parallel",
                status="planned", workspace_path=workspace_path,
                next_required_action="developer: run dual-agent-conflict-gate, post STARTED, implement, post DONE with delivery proof",
            ))

    open_tasks = [t["task_id"] for t in tasks if t["status"] in OPEN_STATUSES]
    return {"tasks": tasks, "open_tasks": open_tasks}


def render_protocol_markdown(
    *,
    workspace,
    plan_file,
    goal_id,
    tasks,
    ledger_sha="",
    date_str="",
    compile_id="",
    supersedes_compile_id="",
    generator="",
    schema_version="",
    plan_fingerprint="",
):
    if not date_str:
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    now = utc_now()
    rows = []
    for t in tasks:
        score = t.get("score") or "—"
        pr = t.get("delivery_pointer") or "—"
        rows.append(
            f"| {t['task_id']} | {t['title']} | {t['status']} "
            f"| {t['task_type']} | {t.get('owner_agent') or '—'} | {score} | {pr} |"
        )
    table = "\n".join(rows)
    sha_line = (
        f"- 账本 index.json SHA：{ledger_sha}"
        if ledger_sha
        else "- 账本 index.json SHA：（首次生成，写入后更新）"
    )
    meta_lines = []
    if compile_id:
        meta_lines.append(f"> Compile ID：{compile_id}\n")
    if supersedes_compile_id:
        meta_lines.append(f"> Supersedes：{supersedes_compile_id}\n")
    if generator:
        meta_lines.append(f"> Generator：{generator}\n")
    if schema_version:
        meta_lines.append(f"> Schema：{schema_version}\n")
    if plan_fingerprint:
        meta_lines.append(f"> Plan Fingerprint：{plan_fingerprint}\n")
    meta_block = "".join(meta_lines)
    return (
        f"# {workspace} 账本清单协议 — {date_str}\n\n"
        f"> 生成时间：{now}\n"
        f"> 来源文档：{plan_file}\n"
        f"> Goal ID：{goal_id}\n"
        f"> 账本 SHA：{ledger_sha or '（写入后更新）'}\n\n"
        f"{meta_block}\n"
        f"## 任务清单\n\n"
        f"| Task ID | 标题 | 状态 | 类型 | 负责 AGENT | 评分 | PR |\n"
        f"|---------|------|------|------|-----------|------|-----|\n"
        f"{table}\n\n"
        f"## 同步状态\n\n"
        f"- 最后同步时间：{now}\n"
        f"- 工作区路径：{workspace}\n"
        f"- 同步触发：collab-ledger-planner CLI\n"
        f"{sha_line}\n"
    )


def find_repo_root(start):
    p = Path(start).resolve()
    for candidate in [p, *p.parents]:
        if (candidate / "AGENT协作工具" / "ledger" / "tasks" / "index.json").exists():
            return candidate
    raise SystemExit("repo_root_not_found")


def apply_to_ledger(repo_root, plan_out):
    ledger_path = Path(repo_root) / "AGENT协作工具" / "ledger" / "tasks" / "index.json"
    existing = json.loads(ledger_path.read_text(encoding="utf-8"))
    existing_tasks = [t for t in (existing.get("tasks") or []) if isinstance(t, dict)]
    existing_ids = {
        str(t.get("task_id") or "").strip()
        for t in existing_tasks
        if str(t.get("task_id") or "").strip()
    }
    for t in plan_out["tasks"]:
        if t["task_id"] in existing_ids:
            raise SystemExit(f"task_id_conflict:{t['task_id']}")
    existing["tasks"] = existing_tasks + plan_out["tasks"]
    open_ids = [
        str(x or "").strip()
        for x in (existing.get("open_tasks") or [])
        if str(x or "").strip()
    ]
    for tid in plan_out["open_tasks"]:
        if tid not in open_ids:
            open_ids.append(tid)
    existing["open_tasks"] = open_ids
    existing["generated_at"] = utc_now()
    ledger_path.write_text(
        json.dumps(existing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return {"written": str(ledger_path), "added": len(plan_out["tasks"])}


def run(args):
    plan_path = Path(args.plan)
    raw_text = plan_path.read_text(encoding="utf-8")
    meta, plan_text = parse_frontmatter(raw_text)

    resolved_goal_id = (args.goal_id or meta.get("goal_id") or "").strip()
    resolved_task_prefix = (args.task_prefix or meta.get("task_prefix") or "").strip()
    resolved_workspace_path = (args.workspace_path or meta.get("workspace") or "").strip()

    errors = []
    if not resolved_goal_id:
        errors.append("missing_goal_id")
    if not resolved_workspace_path:
        errors.append("missing_workspace")
    if not resolved_task_prefix:
        errors.append("missing_task_prefix")

    plan_fingerprint = sha256_text(raw_text)

    if args.validate:
        ok = not errors
        print(
            json.dumps(
                {
                    "ok": ok,
                    "validated": True,
                    "errors": errors,
                    "plan_fingerprint": plan_fingerprint,
                    "frontmatter": meta,
                },
                ensure_ascii=False,
            )
        )
        if not ok:
            raise SystemExit(2)
        return

    if errors:
        print(
            json.dumps(
                {"ok": False, "errors": errors, "plan_fingerprint": plan_fingerprint},
                ensure_ascii=False,
            )
        )
        raise SystemExit(2)

    out = generate_tasks(
        goal_id=resolved_goal_id,
        task_prefix=resolved_task_prefix,
        workspace_path=resolved_workspace_path,
        plan_text=plan_text,
    )

    payload = {
        "version": 1,
        "generated_at": utc_now(),
        "plan_fingerprint": plan_fingerprint,
        "frontmatter": meta,
        "resolved": {
            "goal_id": resolved_goal_id,
            "task_prefix": resolved_task_prefix,
            "workspace_path": resolved_workspace_path,
        },
        "open_tasks": out["open_tasks"],
        "tasks": out["tasks"],
    }

    if args.apply:
        if args.dry_run:
            payload["dry_run"] = True
            payload["would_add"] = len(out["tasks"])
        else:
            repo_root = find_repo_root(Path.cwd())
            applied = apply_to_ledger(repo_root, out)
            payload = {"ok": True, "applied": applied, "draft": payload}

    if args.output_protocol:
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        workspace = resolved_workspace_path.rstrip("/").split("/")[-1]
        now = utc_now()
        protocol_content = render_protocol_markdown(
            workspace=workspace,
            plan_file=str(plan_path),
            goal_id=resolved_goal_id,
            tasks=out["tasks"],
            compile_id="",
            supersedes_compile_id="",
            generator="",
            schema_version=LEDGER_SCHEMA_VERSION,
            plan_fingerprint=plan_fingerprint,
        )
        filename = f"{workspace}-LEDGER-{date_str}.md"
        if args.protocol_dir:
            protocol_path = Path(args.protocol_dir) / filename
        else:
            try:
                repo_root = find_repo_root(Path.cwd())
                protocol_dir = repo_root / "AGENT协作工具" / "ledger" / "protocols"
                protocol_dir.mkdir(parents=True, exist_ok=True)
                protocol_path = protocol_dir / filename
            except SystemExit:
                protocol_path = Path(filename)

        if args.dry_run:
            payload["protocol_dry_run"] = {
                "would_write": str(protocol_path),
                "content_preview": protocol_content[:300] + "...",
            }
        else:
            history_path = protocol_path.with_suffix(".history.jsonl")
            supersedes_compile_id = ""
            if history_path.exists():
                lines = [
                    ln
                    for ln in history_path.read_text(encoding="utf-8").splitlines()
                    if ln.strip()
                ]
                if lines:
                    try:
                        supersedes_compile_id = json.loads(lines[-1]).get("compile_id", "")
                    except Exception:
                        supersedes_compile_id = ""
            compile_id = f"{now}-{plan_fingerprint}"
            protocol_content = render_protocol_markdown(
                workspace=workspace,
                plan_file=str(plan_path),
                goal_id=resolved_goal_id,
                tasks=out["tasks"],
                compile_id=compile_id,
                supersedes_compile_id=supersedes_compile_id,
                generator="collab-ledger-planner@2.0",
                schema_version=LEDGER_SCHEMA_VERSION,
                plan_fingerprint=plan_fingerprint,
            )
            protocol_path.write_text(protocol_content, encoding="utf-8")
            payload["protocol_written"] = str(protocol_path)
            with history_path.open("a", encoding="utf-8") as fh:
                fh.write(
                    json.dumps(
                        {
                            "compile_id": compile_id,
                            "compiled_at": now,
                            "protocol_file": str(protocol_path),
                            "supersedes_compile_id": supersedes_compile_id,
                            "plan_fingerprint": plan_fingerprint,
                            "generator": "collab-ledger-planner@2.0",
                            "schema_version": LEDGER_SCHEMA_VERSION,
                            "goal_id": resolved_goal_id,
                            "workspace_path": resolved_workspace_path,
                            "task_prefix": resolved_task_prefix,
                        },
                        ensure_ascii=False,
                    )
                    + "\n"
                )

    print(json.dumps(payload, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(
        description="Parse a plan Markdown and generate ledger tasks draft."
    )
    parser.add_argument("--plan", required=True)
    parser.add_argument("--goal-id", default="")
    parser.add_argument("--task-prefix", default="")
    parser.add_argument("--workspace-path", default="")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--output-protocol", action="store_true")
    parser.add_argument("--protocol-dir", default="")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--validate", action="store_true")
    args = parser.parse_args()
    run(args)


if __name__ == "__main__":
    main()
