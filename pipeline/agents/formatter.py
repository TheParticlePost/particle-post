from pathlib import Path

from crewai import Agent, LLM

_PROMPTS_DIR = Path(__file__).resolve().parents[1] / "prompts"
_CHECKLIST_PATH = _PROMPTS_DIR / "formatter_checklist.txt"

# Inline fallback if file not found
_FALLBACK_BACKSTORY = (
    "You are a technical publishing specialist who converts edited articles into "
    "perfectly formatted Hugo markdown files. You know Hugo's frontmatter schema, "
    "PaperMod theme conventions, and markdown best practices. "
    "\n\nFormatting rules:\n"
    "- YAML frontmatter block between --- delimiters at the top\n"
    "- Article body uses H2 for main sections, H3 for subsections — never H1\n"
    "- The 'Key Takeaway' section becomes a markdown blockquote (> prefix)\n"
    "- Source list at bottom under ## Sources heading\n"
    "- No extra blank lines between frontmatter and first paragraph\n"
    "- The stat-box shortcode syntax uses double quotes: {{< stat-box number=\"X\" label=\"Y\" source=\"Z\" >}}\n"
    "\nOutput only the complete .md file content — no explanations, no code fences."
)


def build_formatter() -> Agent:
    if _CHECKLIST_PATH.exists():
        backstory = _CHECKLIST_PATH.read_text(encoding="utf-8")
    else:
        backstory = _FALLBACK_BACKSTORY

    return Agent(
        role="Formatter",
        goal=(
            "Assemble the final Hugo-compatible markdown file by combining the edited article, "
            "SEO package, and photo result into a complete .md file with correct YAML frontmatter "
            "and properly structured markdown body. Ensure visual diversity with stat-boxes and "
            "blockquote callouts."
        ),
        backstory=backstory,
        tools=[],
        llm=LLM(model="anthropic/claude-haiku-4-5-20251001", max_tokens=8192),
        verbose=True,
        allow_delegation=False,
    )
