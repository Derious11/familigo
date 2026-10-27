# Server-owned progress — development rollout

Daily sign-in progress now uses the authenticated user's identity, server time,
and one Firestore transaction. A repeated or concurrent request on the same UTC
day is a no-op. The transaction conflicts/retries with challenge-reply updates,
so neither can overwrite the other's XP. No client-provided amount or actor ID
is accepted. The existing reward amounts remain: 10 XP for the following day,
5 after a gap, and no XP when initializing a missing last-active date.

Streak boundaries now use UTC, matching activityMap and adventures, instead of
the browser's local calendar. Historical XP, streaks, and activity are retained.
Future legacy timestamps are not moved backwards or rewarded; inspect malformed
historical data separately rather than silently recalculating users' totals.

The browser can initialize only zero XP, level 1, an empty activity map, and
streak 1 for self / 0 for child profiles. Initial last-active timestamps must
equal server request time. All subsequent direct progress updates or deletions
are denied, including parent and admin browser writes. Profile/name/avatar and
weight updates remain separate. Reply rewards retain their existing server
transaction and formula; self-reported team contributions are still self-reported.
This prevents forged totals, not false claims about physical exercise.

Validation:
- Frontend TypeScript, backend build, development client build.
- New function targeted lint; repository-wide lint has pre-existing failures.
- Dedicated Auth/Firestore emulator: create/update/delete forgery, parent/child
  protection, normal profile edit, missing auth, date boundaries, eight parallel
  sign-ins plus a real reply handler, and retry without extra credit.
- No production deployment or historical data rewrite.

Rollout order: recordSignIn callable, then development client and Firestore rules.
Old tabs should refresh: their legacy direct-write rewards will be denied.
Rollback should retain the protected rules and callable; prefer a forward client
fix. Reverting to the old client cannot securely restore daily reward writes.

Repeat emulator test (after npm --prefix functions run build):
Set JAVA_HOME/PATH to the installed JDK, then:
node .local-tools/firebase-cli/node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --only auth,firestore --project demo-familigo-review --config firebase.review.json "node scripts/test-progress.mjs"

Development deployment completed: recordSignIn, Hosting, and Firestore rules. Live synthetic-account checks passed for concurrent calls, explicit identity/amount forgery, normal Firebase client SDK retry, and denied direct XP updates. Synthetic profiles/accounts were removed. The first smoke attempt hit endpoint propagation immediately after deployment; subsequent explicit HTTP and SDK checks passed. Production remains unchanged.
