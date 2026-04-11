# /test — Run tests and fix failures

1. Run `pnpm test` and capture output
2. If tests pass: report "All N tests passing ✅"
3. If tests fail:
   - Identify each failing test
   - Read the relevant source file
   - Fix the implementation or test (prefer fixing implementation)
   - Re-run until all pass
4. Run `pnpm build` to check for TypeScript errors
5. Fix any type errors found
6. Report final status

When writing new tests, follow `.claude/testing_expert.md` patterns exactly.
