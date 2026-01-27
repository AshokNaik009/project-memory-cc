#!/usr/bin/env python3
"""
Session start hook for Project Memory skill.

This hook runs at the start of each Claude Code session to load
project memory context and provide awareness of tracked features.
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path


def get_project_dir() -> Path:
    """Get the project directory from environment or current working directory."""
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
    return Path(project_dir)


def load_features(project_dir: Path) -> dict | None:
    """Load features.json if it exists."""
    features_path = project_dir / ".claude" / "memory" / "features.json"

    if not features_path.exists():
        return None

    try:
        with open(features_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return None


def build_context(features_data: dict | None) -> str:
    """Build context string from features data."""
    if features_data is None:
        return "No project memory found. Run /init-memory to enable feature tracking."

    features = features_data.get("features", {})

    if not features:
        return "Project memory initialized but empty. Use /execute TICKET-ID description to implement features with tracking."

    # Count by status
    implemented = []
    in_progress = []

    for ticket_id, feature in features.items():
        status = feature.get("status", "unknown")
        if status == "implemented":
            implemented.append(ticket_id)
        elif status == "in_progress":
            in_progress.append(ticket_id)

    # Build context message
    parts = [f"Project has {len(implemented)} implemented feature(s)."]

    if in_progress:
        in_progress_list = ", ".join(in_progress[:3])
        if len(in_progress) > 3:
            in_progress_list += f" and {len(in_progress) - 3} more"
        parts.append(f"In progress: {in_progress_list}.")

    parts.append("Use /execute TICKET-ID description to implement features with duplicate detection.")
    parts.append("Use /memory-status to see all tracked features.")

    return " ".join(parts)


def main():
    """Main entry point for the session start hook."""
    project_dir = get_project_dir()
    features_data = load_features(project_dir)
    context = build_context(features_data)

    # Output JSON response for Claude Code hook system
    response = {
        "hookSpecificOutput": {
            "additionalContext": context
        }
    }

    print(json.dumps(response))


if __name__ == "__main__":
    main()
