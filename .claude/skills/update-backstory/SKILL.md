---
name: update-backstory
description: View or update a CrewAI agent's backstory file with improved best practices, new constraints, or quality improvements. Maintains agent quality without touching Python code.
allowed-tools: Read, Edit, Bash
argument-hint: "researcher | writer | seo-gso | editor | formatter | photo-finder | production-director | ui-designer"
---

!`ls pipeline/prompts/ 2>&1 && echo "---AGENTS---" && ls pipeline/agents/ 2>&1`

# Particle Post — Agent Backstory Manager

## Agent-to-File Map

| Agent | Backstory File | Loading Pattern |
|-------|---------------|-----------------|
| `researcher` | `pipeline/prompts/researcher_backstory.txt` | Loaded by `researcher.py` |
| `writer` | `pipeline/prompts/writer_backstory.txt` | Loaded by `writer.py` |
| `seo-gso` | `pipeline/prompts/seo_gso_backstory.txt` | Loaded by `seo_gso_specialist.py` |
| `editor` | `pipeline/prompts/editor_styleguide.txt` | Loaded by `editor.py` (fallback: `editor_backstory.txt`) |
| `formatter` | `pipeline/prompts/formatter_checklist.txt` | Loaded by `formatter.py` |
| `ui-designer` | `pipeline/prompts/ui_design_principles.txt` | Loaded by `ui_designer.py` |
| `topic-selector` | `pipeline/agents/topic_selector.py` | Inline backstory (edit Python) |
| `photo-finder` | `pipeline/agents/photo_finder.py` | Inline backstory (edit Python) |
| `production-director` | `pipeline/agents/production_director.py` | Inline backstory (edit Python) |

## Instructions

1. **Match** `$ARGUMENTS` to an agent name above. If blank or invalid, list the options.

2. **Read** the current backstory file.

3. **Read** the agent's corresponding task file in `pipeline/tasks/` to understand what the agent is asked to produce.

4. **Quality checklist** — evaluate the backstory against:
   - Does it specify the EXACT output format (delimiters, JSON fields)?
   - Does it list all prohibited AI-tell words explicitly?
   - Does it tell the agent what NOT to remove (GSO structure, FAQ, Key Takeaway)?
   - Does it handle known failure modes for this agent?
   - Is it compact enough for the agent's token budget?
   - Does it include funnel-type-specific guidance?

5. **If updating**: Show the proposed diff, get confirmation, then write the file.

6. **Remind**: After updating, suggest testing with a dry run:
   ```
   gh workflow run morning-post.yml -f dry_run=true
   ```
