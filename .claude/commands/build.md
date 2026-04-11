# /build — Start or continue the current phase

Read `.claude/project_phases.md` and identify the current active phase (marked at the bottom of the file).

Then:
1. State which phase is active and what the goal is
2. List all incomplete tasks in that phase (tasks without ✅)
3. Start implementing the first incomplete task
4. After completing each task, mark it with ✅ in project_phases.md
5. Continue until all tasks in the phase are done
6. When phase is complete: update the "Current phase" line at the bottom of project_phases.md to the next phase
7. Ask: "Phase N complete. Start Phase N+1?"

Always read the relevant expert files before writing code:
- DB work → supabase_expert.md
- UI work → frontend_expert.md + design/design_system.md
- API routes → web_security.md
- Any code → clean_code.md
