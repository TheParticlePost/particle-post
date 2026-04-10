"""
Gemini image generation pricing.
Single source of truth on the Python side.

Keep in sync with:
  - lib/covers/gemini/client.ts  (GEMINI_IMAGE_PRICE_USD)
  - app/api/admin/costs/route.ts (GEMINI_IMAGE_PRICE_USD)
"""

# Gemini 2.5 Flash Image ("Nano Banana") pricing as of April 2026.
GEMINI_IMAGE_PRICE_USD = 0.039


def estimate_gemini_cost(image_count: int) -> float:
    """Estimate USD cost for N generated images."""
    return round(image_count * GEMINI_IMAGE_PRICE_USD, 4)
