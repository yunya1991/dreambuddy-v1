from datetime import datetime, timezone


def quality_multiplier(score):
    if score >= 90:
        return 1.2
    if score >= 80:
        return 1.0
    return 0.0


def calculate_reward(base_reward, score):
    multiplier = quality_multiplier(score)
    return {
        "quality_multiplier": multiplier,
        "final_reward": int(base_reward * multiplier),
    }


def utc_now():
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def append_reward_record(reward_index, record):
    reward_index["generated_at"] = utc_now()
    reward_index["reward_records"].append(record)
    return reward_index
