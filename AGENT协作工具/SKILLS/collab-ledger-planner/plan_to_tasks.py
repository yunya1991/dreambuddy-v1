import argparse, json, re
from datetime import datetime, timezone
from pathlib import Path

OPEN_STATUSES = {"planned", "open", "accepted", "rework", "blocked"}

def utc_now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

print("plan_to_tasks module loaded")
