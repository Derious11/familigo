# Production release — October 25, 2026

Application revision: `f62fb8c` on `codex/release-review-checkpoint`.
The user explicitly requested production promotion after confirming photo
completion worked in development. This is not certification that the original
full review plan is complete: cold-load LCP remains above target, INP is unmeasured,
and the full device/journey matrix remains open.

Final checks passed: 39 frontend tests, 40 backend tests, credential scan,
backend and production frontend builds. Current production ordering audit found
15 messages, 48 challenges and 59 replies with valid timestamps; all challenge
expiry fields were valid.

## Rollback preparation

Previous Hosting version: `sites/familigo-11643/versions/4553f3726c49bf3f`.
Preserved channel: `familigo-11643:rollback-20261025`.
Restore Hosting with:

```powershell
node .local-tools/firebase-cli/node_modules/firebase-tools/lib/bin/firebase.js hosting:clone familigo-11643:rollback-20261025 familigo-11643:live --project familigo-11643 --non-interactive
```

Prior rules sources/release IDs and allowlisted function versions are recorded
locally in `artifacts/release-review/production-rollback-20261025.json`.
Hosting rollback does not restore rules/functions/data. The old client uses direct
deletion that the new rules deny; prefer a forward client fix rather than restoring
insecure delete rules. Keep the deletion worker/callable and write guards active
while any deletion jobs remain pending. Additive indexes can stay.

## Rollout

Production Storage cross-service IAM prerequisite is verified. Deploy additive
indexes and wait for readiness; deploy the deletion callable/worker and two write
guards before the coordinated Firestore/Storage rules and production client.
Record completion and smoke-test results below after deployment finishes.

All three exact production pagination queries now succeed. The four scoped
functions, Firestore/Storage rules and Firebase Hosting deployed successfully.
The Firebase-hosted HTML matches the production build. A real SDK photo-upload
smoke test succeeded and outsider metadata reads were denied; synthetic accounts,
image and fixture documents were removed afterward.

The public custom domain is served by Vercel via GitHub `main`, separately from
Firebase Hosting (documented in `PWA.md`). Its pre-release revision is `6527ffd`.
Public-site publication requires pushing the reviewed release to `main`; verify
the custom domain afterward. Roll back that frontend via Vercel's previous
production deployment or a deliberate revert on main; Firebase Hosting rollback
alone does not change the public custom domain.
