#!/usr/bin/env python3
"""
Particle Post Pipeline Entry Point

Usage:
    python pipeline/run.py --slot morning
    python pipeline/run.py --slot evening
    python pipeline/run.py --slot morning --dry-run   # skips file write, prints result
"""

import argparse
import os
import sys
from dotenv import load_dotenv

# Load .env file for local development (GitHub Actions uses secrets directly)
load_dotenv()


def _check_env() -> list[str]:
    """Return list of missing required environment variables."""
    required = [
        "ANTHROPIC_API_KEY",
        "TAVILY_API_KEY",
    ]
    return [var for var in required if not os.environ.get(var)]


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Particle Post publishing pipeline.")
    parser.add_argument(
        "--slot",
        choices=["morning", "evening"],
        required=True,
        help="Which daily slot to publish for.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run the full pipeline but skip writing the file to disk.",
    )
    args = parser.parse_args()

    # Validate environment
    missing = _check_env()
    if missing:
        print(f"ERROR: Missing required environment variables: {', '.join(missing)}")
        print("Set them in .env (local) or GitHub Actions secrets (CI).")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"  PARTICLE POST — {args.slot.upper()} PIPELINE")
    print(f"{'='*60}\n")

    # Import here so env vars are loaded before any module-level API client init
    from pipeline.crew import build_crew

    crew = build_crew(slot=args.slot)

    if args.dry_run:
        print("[DRY RUN] Pipeline will execute but file_writer tool will be skipped.")
        # Monkey-patch file_writer to print instead of write
        import pipeline.tools.file_writer as fw_module
        original_run = fw_module.FileWriterTool._run

        def dry_run_write(self, input_json: str) -> str:
            print(f"\n[DRY RUN] Would write file with input:\n{input_json[:500]}...\n")
            return "DRY RUN: file not written."

        fw_module.FileWriterTool._run = dry_run_write

    result = crew.kickoff()

    print(f"\n{'='*60}")
    print("  PIPELINE COMPLETE")
    print(f"{'='*60}")
    print(f"\nFinal result:\n{result}")


if __name__ == "__main__":
    main()
