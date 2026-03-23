"""
CSS and Template editor tools for the UI Designer agent.

Four tools in one file (tightly coupled reader/editor pairs):
  - CSSReaderTool     — reads custom.css in full
  - CSSEditorTool     — exact string find/replace in custom.css
  - TemplateReaderTool — reads a Hugo template by name
  - TemplateEditorTool — exact string find/replace in a Hugo template

Safety rules enforced at tool level:
  - CSSEditorTool refuses to touch --accent-blue or --accent-amber (brand colors)
  - All writes are atomic: read → modify → write
  - Failed finds return an explicit error (no silent no-op)
"""

import json
from pathlib import Path

from crewai.tools import BaseTool

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_CSS_FILE  = _REPO_ROOT / "blog" / "assets" / "css" / "extended" / "custom.css"

_TEMPLATE_MAP = {
    "header":    _REPO_ROOT / "blog" / "layouts" / "partials" / "header.html",
    "home_info": _REPO_ROOT / "blog" / "layouts" / "partials" / "home_info.html",
    "list":      _REPO_ROOT / "blog" / "layouts" / "_default" / "list.html",
    "footer":    _REPO_ROOT / "blog" / "layouts" / "partials" / "footer.html",
}

_PROTECTED_CSS_VARS = ("--accent-blue", "--accent-amber")


class CSSReaderTool(BaseTool):
    name: str = "css_reader"
    description: str = (
        "Read the full contents of the site's custom CSS file (custom.css). "
        "Call this before making any edits so you know the exact current state. "
        "Input: any string (ignored)."
    )

    def _run(self, _: str = "") -> str:
        try:
            return _CSS_FILE.read_text(encoding="utf-8")
        except Exception as exc:
            return f"[CSS Reader] Error reading custom.css: {exc}"


class CSSEditorTool(BaseTool):
    name: str = "css_editor"
    description: str = (
        "Make a targeted find/replace edit in custom.css. "
        "You MUST call css_reader first to see the exact current content. "
        "Input: JSON string with keys:\n"
        '  "find"     — exact string to find (must exist verbatim in the file)\n'
        '  "replace"  — replacement string\n'
        '  "rationale"— brief reason for this change\n'
        "Returns: 'Changed: X -> Y' on success, or 'NOT FOUND: X' on failure.\n"
        "NEVER use this to change --accent-blue or --accent-amber (brand colors are protected)."
    )

    def _run(self, input_str: str) -> str:
        try:
            data = json.loads(input_str)
        except (json.JSONDecodeError, ValueError) as exc:
            return f"[CSS Editor] Invalid JSON input: {exc}"

        find      = data.get("find", "")
        replace   = data.get("replace", "")
        rationale = data.get("rationale", "")

        if not find:
            return "[CSS Editor] 'find' field is required."

        # Brand color guard — enforced at tool level
        for protected in _PROTECTED_CSS_VARS:
            if protected in find:
                return (
                    f"[CSS Editor] BLOCKED: '{protected}' is a protected brand color "
                    "and cannot be modified by the UI Designer. "
                    "Only change spacing, font-size, border-radius, and non-brand values."
                )

        try:
            content = _CSS_FILE.read_text(encoding="utf-8")
        except Exception as exc:
            return f"[CSS Editor] Error reading file: {exc}"

        if find not in content:
            return f"[CSS Editor] NOT FOUND: {repr(find[:120])}"

        new_content = content.replace(find, replace, 1)

        try:
            _CSS_FILE.write_text(new_content, encoding="utf-8")
        except Exception as exc:
            return f"[CSS Editor] Error writing file: {exc}"

        find_preview    = find.strip()[:60]
        replace_preview = replace.strip()[:60]
        return f"[CSS Editor] Changed: {repr(find_preview)} → {repr(replace_preview)} ({rationale})"


class TemplateReaderTool(BaseTool):
    name: str = "template_reader"
    description: str = (
        "Read a Hugo template file by name. "
        "Call this before editing to see the exact current content. "
        "Input: one of 'header', 'home_info', 'list', 'footer'."
    )

    def _run(self, template_name: str) -> str:
        template_name = template_name.strip().lower()
        path = _TEMPLATE_MAP.get(template_name)
        if path is None:
            return (
                f"[Template Reader] Unknown template '{template_name}'. "
                f"Valid names: {', '.join(_TEMPLATE_MAP)}"
            )
        try:
            return path.read_text(encoding="utf-8")
        except Exception as exc:
            return f"[Template Reader] Error reading {template_name}: {exc}"


class TemplateEditorTool(BaseTool):
    name: str = "template_editor"
    description: str = (
        "Make a targeted find/replace edit in a Hugo template file. "
        "You MUST call template_reader first to see the exact current content. "
        "Input: JSON string with keys:\n"
        '  "template" — one of: header, home_info, list, footer\n'
        '  "find"     — exact string to find (must exist verbatim in the file)\n'
        '  "replace"  — replacement string\n'
        '  "rationale"— brief reason for this change\n'
        "Returns: 'Changed: X -> Y' on success, or 'NOT FOUND: X' on failure."
    )

    def _run(self, input_str: str) -> str:
        try:
            data = json.loads(input_str)
        except (json.JSONDecodeError, ValueError) as exc:
            return f"[Template Editor] Invalid JSON input: {exc}"

        template_name = data.get("template", "").strip().lower()
        find          = data.get("find", "")
        replace       = data.get("replace", "")
        rationale     = data.get("rationale", "")

        if not template_name:
            return "[Template Editor] 'template' field is required."
        if not find:
            return "[Template Editor] 'find' field is required."

        path = _TEMPLATE_MAP.get(template_name)
        if path is None:
            return (
                f"[Template Editor] Unknown template '{template_name}'. "
                f"Valid names: {', '.join(_TEMPLATE_MAP)}"
            )

        try:
            content = path.read_text(encoding="utf-8")
        except Exception as exc:
            return f"[Template Editor] Error reading file: {exc}"

        if find not in content:
            return f"[Template Editor] NOT FOUND in {template_name}: {repr(find[:120])}"

        new_content = content.replace(find, replace, 1)

        try:
            path.write_text(new_content, encoding="utf-8")
        except Exception as exc:
            return f"[Template Editor] Error writing file: {exc}"

        find_preview    = find.strip()[:60]
        replace_preview = replace.strip()[:60]
        return (
            f"[Template Editor] Changed in {template_name}: "
            f"{repr(find_preview)} → {repr(replace_preview)} ({rationale})"
        )
