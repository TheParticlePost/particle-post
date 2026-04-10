"""
Token usage and cost logging for Particle Post pipeline runs.

Writes JSON logs to pipeline/logs/costs/ for dashboard display.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

COSTS_DIR = Path(__file__).resolve().parent.parent / "logs" / "costs"

# Pricing per 1M tokens (as of March 2026)
PRICING = {
    "haiku": {"input": 0.80, "output": 4.00},
    "sonnet": {"input": 3.00, "output": 15.00},
}

# The main publishing crew uses 4 Haiku + 4 Sonnet agents.
# Marketing/Security crews use mostly Sonnet.
# We use a blended rate for the publishing pipeline.
BLENDED_INPUT = (
    4 * PRICING["haiku"]["input"] + 4 * PRICING["sonnet"]["input"]
) / 8  # $1.90/M
BLENDED_OUTPUT = (
    4 * PRICING["haiku"]["output"] + 4 * PRICING["sonnet"]["output"]
) / 8  # $9.50/M


def calculate_cost(prompt_tokens: int, completion_tokens: int) -> float:
    """Estimate cost in USD using blended per-token rates."""
    input_cost = (prompt_tokens / 1_000_000) * BLENDED_INPUT
    output_cost = (completion_tokens / 1_000_000) * BLENDED_OUTPUT
    return round(input_cost + output_cost, 4)


def save_cost_log(
    usage,
    slot: str,
    attempt: int = 1,
    verdict: str = "",
    gemini_image_count: int = 0,
    gemini_cost_usd: float = 0.0,
) -> Path:
    """
    Save a cost log entry from a CrewAI UsageMetrics object.

    Args:
        usage: CrewOutput.token_usage (UsageMetrics with total_tokens, prompt_tokens, etc.)
        slot: Pipeline slot (morning, evening, marketing, security, human-morning, etc.)
        attempt: Pipeline attempt number
        verdict: APPROVE/REJECT/N/A
        gemini_image_count: Number of Gemini images generated during this run
        gemini_cost_usd: USD cost estimate for the Gemini calls
    """
    COSTS_DIR.mkdir(parents=True, exist_ok=True)

    prompt_tokens = getattr(usage, "prompt_tokens", 0) or 0
    completion_tokens = getattr(usage, "completion_tokens", 0) or 0
    total_tokens = getattr(usage, "total_tokens", 0) or 0
    successful_requests = getattr(usage, "successful_requests", 0) or 0
    cached_prompt_tokens = getattr(usage, "cached_prompt_tokens", 0) or 0

    anthropic_cost = calculate_cost(prompt_tokens, completion_tokens)
    total_cost = round(anthropic_cost + float(gemini_cost_usd or 0.0), 4)

    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "slot": slot,
        "attempt": attempt,
        "prompt_tokens": prompt_tokens,
        "cached_prompt_tokens": cached_prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": total_tokens,
        "successful_requests": successful_requests,
        # Backwards-compat: existing consumers read estimated_cost_usd as the
        # Anthropic-only figure. total_cost_usd is the new all-provider total.
        "estimated_cost_usd": anthropic_cost,
        "anthropic_cost_usd": anthropic_cost,
        "gemini_image_count": int(gemini_image_count or 0),
        "gemini_cost_usd": round(float(gemini_cost_usd or 0.0), 4),
        "total_cost_usd": total_cost,
        "verdict": verdict,
    }

    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"{date_str}-{slot}.json"
    filepath = COSTS_DIR / filename

    filepath.write_text(json.dumps(entry, indent=2), encoding="utf-8")
    gemini_suffix = (
        f" + Gemini ${float(gemini_cost_usd):.4f} [{int(gemini_image_count)} img]"
        if gemini_image_count
        else ""
    )
    print(
        f"  [Cost Logger] Saved cost log: {filename} "
        f"(Anthropic ${anthropic_cost:.4f}{gemini_suffix})"
    )
    return filepath
