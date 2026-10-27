# Development scalability and recovery review — October 26, 2026

Production remains at c2be231. Work here is on codex/server-owned-progress.
The original device/journey matrix was reported complete by the user.
New development changes need a focused regression check before promotion.

## Changes

- Admin users, invitations, families, challenges, feedback, and audit load in
  explicit 50-record pages. Feedback metadata is fetched only for that page.
  Lists/searches/metrics explicitly state when they cover only loaded records.
  Invite funnel conclusions remain unavailable until their dependencies are complete.
- Feed queries unexpired challenges, ordered by soonest expiration; history queries
  expired challenges, most recently ended first. Each query is capped at 30.
  A separate one-record watcher schedules the next expiry refresh. Loaded page
  depth is retained across expiry refreshes. Query boundaries use device time;
  wrong device clocks remain a display limitation, not an authorization source.
- New progress writes archive each day in users/{id}/activityDays. Migrated profiles
  keep a 90-day summary for the calendar and recent adventure suggestions.
  Historical totals are not recalculated.
- Weight logs use immutable users/{id}/weightEntries records and an atomic
  summary update, validated together by rules. Retried modal submissions reuse an
  ID; a saved weight is not duplicated when a later challenge reply fails.
  History is available in 30-record pages only when the profile history opens.
- Migration uses batches of 100 and checks the source profile update time in
  each transaction. Private backups precede writes; interrupted migration is
  resumable. Legacy weight units that were never stored are labeled unknown,
  rather than guessed. Production migration is deliberately not run.
- Keyboard focus styles include portaled dialogs; reduced-motion applies globally.
  Weight failures have alert semantics, unit controls expose selection, and
  offline weight submissions fail promptly while retaining the form.

## Recorded evidence

- Large emulator fixture: 800 activity days + 500 weight entries archived;
  90 days retained in profile; XP unchanged; rerun skips completed migration.
- 125 admin accounts fully accessible through <=50-record pages.
- 125 interleaved challenges return 62 active / 63 expired through <=30-record queries.
- Simulated long-session sequence: 10 visits, four pages each; 40 subscriptions,
  40 snapshots, 1,200 document deliveries, peak four listeners, zero after teardown.
  These are emulator snapshot deliveries, not production billed reads.
- Daily progress concurrency regression: eight simultaneous sign-ins plus a reply
  retain exactly one daily reward and both activity increments.
- Unit coverage includes pagination rebasing/retry, adventure calculations,
  calendar dates, achievements, admin insights, and overlapping scroll locks.

## Remaining acceptance limits

This is not a claim that every screen/state has passed a full accessibility audit.
Automated Chrome checks passed at 390px and 1440px: keyboard focus trapping and
restoration, failed-post retry, automatic expiry transition, empty history,
offline weight draft recovery, dark-mode overflow, and reduced motion. No page
JavaScript errors were recorded. Comprehensive manual contrast,
screen-reader review, physical-device regression of the new history controls,
and production-session billing/latency measurements remain distinct follow-ups.
Cold-load LCP and field INP targets are not resolved by this batch.

## Development rollout order and rollback

1. Build/verify added expiration indexes.
2. Deploy recordSignIn and recordChallengeReply archive writers.
3. Deploy the matching client and rules.
4. Preview then apply scripts/migrate-profile-history.mjs familigo-dev-11643;
   --apply saves ignored private backups and archives before trimming.
5. Verify live development queries, weights, and archived history.

Do not roll back to a client that appends weightHistory or writes progress directly.
Retain protected rules, archive writers, and archived records; use a forward fix.
No stored production content or production rules are changed by this batch.

## Final development verification — October 27, 2026

- Frontend type check, backend build, development build, and 40 focused unit
  tests passed. The build still warns about the large Firebase chunk and old
  browser compatibility metadata; performance targets remain open.
- Development functions, rules, and expiration indexes deployed successfully.
  Final client accessibility refinements deployed to Hosting on October 27.
- All four development profiles were backed up and migrated. Private backups
  remain in ignored `.test-artifacts/profile-history-backup-1793080389239`.
- Live synthetic development smoke tests confirmed one reward across concurrent
  sign-ins, denial of direct XP edits, idempotent weight retries, and archived
  history reads. Test accounts and records were removed.
- Final hosted HTML matches the local build. Six public routes passed at both
  390px and 1440px: HTTP 200, no horizontal overflow, and no JavaScript errors.
- See [development acceptance checklist](development-acceptance-checklist.md)
  for required device checks and remaining production release gates.
