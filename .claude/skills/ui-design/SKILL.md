---
name: ui-design
description: Load the Particle Post design system, review UI backlog, and make CSS/template changes. Also use to manage the UI improvement backlog and update the UI Designer agent's design principles.
allowed-tools: Read, Edit, Bash
---

!`cat "blog/assets/css/extended/custom.css" 2>/dev/null || echo "(custom.css not found)"`
!`cat "pipeline/prompts/ui_design_principles.txt" 2>/dev/null || echo "(not yet created)"`
!`cat "pipeline/config/ui_backlog.json" 2>/dev/null || echo "(ui_backlog.json not found)"`
!`cat "pipeline/config/ui_change_history.json" 2>/dev/null || echo "(no history yet)"`

# Particle Post — UI Design System + Backlog Manager

## Design System Reference

See `/frontend-design` skill for the full design system (tokens, typography, layout, accessibility, anti-slop rules). The live CSS and design principles are pre-loaded above.

## UI Backlog Management

The `ui_backlog.json` is pre-loaded above. It contains prioritized UI improvements.

### View backlog
The backlog is already loaded. Show it as a table:
```
ID      | Component     | Priority | Status  | Description
────────┼───────────────┼──────────┼─────────┼────────────
UI-001  | stat-box      | high     | pending | Improve stat-box visual design
```

### Add to backlog
To add a new item, Edit `pipeline/config/ui_backlog.json`:
- Assign next sequential ID (UI-XXX)
- Set status: "pending"
- Set source: "manual" (for interactive additions)
- Set created: today's date

### Pick from backlog
To work on a backlog item:
1. Pick the highest-priority pending item
2. Read the relevant CSS/template files
3. Implement the change using Edit tool
4. Update the item status to "completed" in ui_backlog.json
5. Move it to the "completed" array with completion date

## Making CSS Changes

### Protected Values (NEVER modify)
```
--accent-blue:  #2563EB
--accent-amber: #F59E0B
```

### Change Workflow
1. Find the exact current value in the pre-loaded CSS
2. Verify the change maintains WCAG AA contrast in both light and dark modes
3. Edit with the Edit tool (exact string replacement)
4. Check if dark mode `[data-theme="dark"]` needs a parallel update
5. Run `git diff blog/assets/css/extended/custom.css` to verify

### Cooldown Rule
Check `ui_change_history.json` (pre-loaded above). Do NOT re-change any component/property that was changed within the last 7 days.

## UI Designer Agent Bridge

The CrewAI UI Designer agent reads `pipeline/prompts/ui_design_principles.txt`.
To update the agent's design knowledge:
1. Review the file content (pre-loaded above)
2. Edit it with the Edit tool
3. Next automated UI Designer run picks up changes automatically
