# Achievement production release

Target: `familigo-11643`, default Standard Edition Firestore database in `nam5`.
The user authorized production deployment and quiet historical backfill.
Read-only preview: 4 families, 9 members, 25 new individual awards, and 48
completions lacking reliable historical dates. No dates or streaks are invented.
Selected functions use Node 22; Node 20 is scheduled for decommission on
October 30, 2026 (Google Cloud runtime-support schedule).

## Execution plan

1. Repair the Firebase Admin SDK notification FieldPath/FieldValue imports and
   bound human-message sender names in both rules and the client.
2. Validate backend tests, notification regression tests, TypeScript, the
   production build, rules/concurrency tests and the live-trigger demo journey.
   Run staged credential checks before committing and security checks before push.
3. Push the achievement commit and release fixes to main.
4. Deploy `achievementChallengeCreated` and `reconcileAchievements` first.
   Then deploy the activity callables and chat badge trigger, plus the three
   notification triggers using the repaired helper.
5. Deploy the matching Firestore rules and Hosting build in one release command.
   Already open clients should refresh after this coordinated update.
6. Preview every production Family Circle with the bounded reconciliation engine.
   If all previews succeed, retain an ignored local snapshot of achievement
   profiles, family awards and member badge counts, then apply quiet backfill.
   Verify a second preview finds zero remaining awards. Keep prior awards, pins,
   celebration claims and XP intact; emit no historical announcements.
7. Verify the deployed callable endpoints require authentication, confirm the
   production frontend contains the achievement UI, and inspect live badges when
   an authenticated browser session is available. Record any verification limits.

## Recovery

Do not loosen rules or substitute direct client award writes if an endpoint fails.
Repair the backend before releasing its frontend. Before step 5, the currently
deployed Hosting bundle stays usable. If the coordinated release must be rolled
back, restore both the previous Hosting bundle and its matching Firestore rules
from commit `271dfa4`; do not roll back only one half. Achievement records are
additive, preserved by backfill, and remain server-owned.

The operational migration uses existing IAM credentials and calls the shared
reconciliation engine directly. It does not forge Firebase user claims or create
an administrator account. Backups and logs stay in ignored `.test-artifacts/`.

## Executed on October 13, 2026

- Pushed the achievement implementation (`c398a10`), production preparation
  (`df56ad6`), and achievement availability copy (`ff9ffb5`) to `main`.
- Deployed seven achievement functions in the planned order to production using
  Node 22: achievementChallengeCreated, reconcileAchievements, recordChallenge,
  recordChallengeReply, recordChallengeReaction, updateAchievementProfile, and
  achievementChatCreated.
- Updated onChallengeCreated, onReplyCreated, and onMessageCreated with the
  repaired notification helper, also on Node 22.
- Released the tested Firestore rules and matching production Hosting bundle
  together. The published bundle includes the new profile badge UI and removes
  obsolete achievement-preview wording from the homepage and FAQ.
- Applied quiet backfill: 4 families, 9 members, 25 new individual badge awards.
  Retained an ignored local pre-migration recovery snapshot. A second preview
  found zero remaining awards. The 48 completions without reliable dates were
  not used to invent activity streaks.
- Verified all five callable endpoints accept the live site's CORS origin and
  reject unauthenticated requests with HTTP 401 / UNAUTHENTICATED.
- Refreshed the user's existing signed-in production session. The profile shows
  Earned Badges · 9, next-achievement progress, pin controls, and the family badge
  section, with no achievement loading alerts. Existing XP and legacy badges
  remain visible. Private live proof is in ignored
  `.test-artifacts/production-achievements.jpg`, not public marketing assets.
- Validation: production build and TypeScript passed; 19 engine/notification
  unit tests, 22 controlled rules/concurrency checks, and the 11-check real-trigger
  demo journey passed under Node 22. Credential checks passed before commits
  and pushes. Existing bundle-size and browser-data warnings remain.

Real-device push delivery, offline behavior, and screen-reader testing were not
claimed by this deployment verification. No synthetic activity or test messages
were posted to production, and no private family screenshots were committed.
