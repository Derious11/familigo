# History and large-account release

Base: production a9eb694. Deploy the two additive expiration indexes and verify
both query directions, then recordSignIn and recordChallengeReply, followed by
rules and the matching clients. No other production functions should be redeployed.
Old installed clients need an update to log weight once legacy array writes are blocked.

Production migration is deliberately separate from the development script:
scripts/production-history.mjs accepts only the production project and explicit
preview/rehearse/canary/remaining/verify modes. Supply a unique history-* backup
label in every mode. Configure NODE_PATH for the installed Firebase CLI libraries.
preview reads profile documents with native Firestore field types, checks
destinations and writes a Windows current-user DPAPI-encrypted backup under
ignored .test-artifacts. Keep this backup and its Windows account available.
rehearse requires the dedicated localhost emulator; restore all fields and
compare, migrate locally, verify archives, then record the backup digest.
Cloud writes require that digest and a fresh backup. Canary selects the profile
with the most weight entries, breaking ties by activity count. Each subsequent
profile is migrated and verified individually. If a source changes, stop for
review; never blindly restore an old snapshot over new activity. Rehearse and
preview again with a new label before proceeding with a refreshed backup.
After an interrupted batch, replay only matching rows. Conflicting destinations
are never overwritten. Verify all original activity and weight records, summary
fields and unrelated data before declaring the migration complete.

Rollback: retain archives, writer functions, new weight rules and backups. Use a
forward client fix after migration, not a client that appends to weightHistory.
The encrypted pre-migration documents can be restored in an isolated emulator
for comparison. Any production recovery must merge later activity rather than
overwriting profiles. No deletes of historical archive rows are needed.
