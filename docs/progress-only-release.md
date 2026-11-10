# Progress-only release

Base: 8c1bcea. Daily rewards are calculated by the authenticated recordSignIn
callable against server UTC days in a Firestore transaction; concurrent challenge
rewards are preserved. Existing balances are not recalculated. No archive
subcollections, history migration, index changes or weight changes.

Firestore clients cannot modify XP, level, streak, activityMap or lastActiveDate.
New clients use server time on profile creation. Previously released clients
send a device timestamp: accept the current UTC date only for initial values,
never an earlier reward day. Older clients can sign in and complete challenges,
but their legacy daily writes are denied; updating enables server daily rewards.

Rollout: verify live rules match the baseline; save the previous Hosting release
and ruleset; deploy recordSignIn, then the protected Firestore rules and verify
a synthetic production reward and retry. Publish matching clients only after
successful backend checks. Keep the function and progress protections in place
during client recovery; prefer a forward fix. Do not loosen permissions just
to restore the obsolete client calculation. No migration or backfill to undo.

Verification: scripts/test-progress.mjs covers concurrent requests plus an actual
challenge reply transaction, retries, date boundaries, protected fields, and
legacy and server-timestamp creation. Run the existing production client's
scripts/test-performance-release.mjs and the new client's version against the
candidate rules using isolated review emulators for login and text/photo journeys.
