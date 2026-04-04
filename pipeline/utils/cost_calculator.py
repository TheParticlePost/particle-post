"""
Shared cost estimation for Particle Post pipeline.

Single source of truth for Anthropic API cost calculations.
Used by: marketing_director.py, admin costs API (TypeScript mirrors this).

Pricing (as of 2026-04):
  Sonnet: $3 / 1M input, $15 / 1M output
  Haiku:  $0.25 / 1M input, $1.25 / 1M output
  Mix assumption: 60% Sonnet, 40% Haiku
"""

# Per-token costs (USD)
SONNET_INPUT = 3.0 / 1_000_000      # $0.000003
SONNET_OUTPUT = 15.0 / 1_000_000    # $0.000015
HAIKU_INPUT = 0.25 / 1_000_000      # $0.00000025
HAIKU_OUTPUT = 1.25 / 1_000_000     # $0.00000125

# Assumed model mix (fraction of tokens processed by each)
SONNET_FRACTION = 0.60
HAIKU_FRACTION = 0.40


def estimate_cost(input_tokens: int, output_tokens: int) -> float:
    """Estimate USD cost for a pipeline run given token counts.

    Uses a blended rate assuming 60% Sonnet / 40% Haiku token split.
    """
    sonnet_cost = (input_tokens * SONNET_INPUT + output_tokens * SONNET_OUTPUT) * SONNET_FRACTION
    haiku_cost = (input_tokens * HAIKU_INPUT + output_tokens * HAIKU_OUTPUT) * HAIKU_FRACTION
    return sonnet_cost + haiku_cost
