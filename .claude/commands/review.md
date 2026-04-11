# /review — Review the last change for quality

Review the most recently modified files against all standards.

Check against:
1. **clean_code.md** — naming, TypeScript strict, no `any`, single responsibility
2. **web_security.md** — no secrets in client, Zod validation, auth checks
3. **testing_expert.md** — is the new code tested? Are tests meaningful?
4. **design/design_system.md** — if UI: correct tokens, dark mode, spacing

For each file changed, report:
- ✅ What's good
- ⚠️ What needs improvement (with specific line references)
- 🔴 What must be fixed before shipping

Then fix all 🔴 items immediately. Ask about ⚠️ items.
