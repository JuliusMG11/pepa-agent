# /deploy — Prepare for production deployment

Work through `.claude/deployment.md` systematically.

1. Run pre-deploy checks:
   - `pnpm build` — must pass with 0 errors
   - `pnpm test` — must pass
   - Security audit: grep for secrets in client bundle
   - Check all env vars in `.env.local.example` are documented

2. Generate deployment checklist output:
   - List all env vars that need to be set in Vercel
   - List all Supabase setup steps not yet done
   - List post-deploy smoke tests to run

3. If any issues found: fix them before declaring ready

4. Output a deployment-ready summary with:
   - All env vars and their sources
   - Commands to run in order
   - Telegram webhook registration command with placeholders
