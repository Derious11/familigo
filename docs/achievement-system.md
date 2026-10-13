# FamiliGo achievements

## Goal and audit

Implement the 16 requested badges for activation, sustainable participation,
social encouragement and shared family wins without replacing the existing app.
Implementation plan: audit existing flows; secure activity recording and add
aggregate evaluation; integrate profile/chat/celebrations; reconcile historical
data; validate rules, concurrency and mobile rendering.

The app already had Firestore challenges, replies (including threaded comments),
team contributions, Family Chat, member switching for parent-managed children,
profile customization, login streaks, XP, activityMap leaderboards, push
notifications, canvas-confetti and an accessible modal. The old badge collection
read a static Firestore catalog and client-side challenge creation unlocked b1.
Reactions were anonymous counters, and completedBy had no enrollment or per-user
completion date. There were Node tests and an isolated Auth/Firestore emulator
configuration, but no root frontend lint script.

The new catalog and pure engine live in functions/src/achievements. The browser
imports only these pure modules, never backend code or credentials. Existing b1
and other legacy unlocked badges remain visible in an earlier-badges section.

## Catalog and calendar policy

All badge XP bonuses are **zero**. The existing reply XP formula remains
10 + contributionValue, now committed once with the reply transaction. Individual
completion retries cannot grant additional reply XP. Login rewards and the
leaderboard calculation are unchanged. Weekly achievement streaks measure
completed activity, independently of the existing daily login streak.

UTC calendar days and Monday-start weeks are used, matching activityMap storage
keys. A qualifying week has at least two distinct days with completed challenges;
rest days are allowed. An unfinished current week keeps the previous week's
streak available. Skipping a whole week resets current progress, never earned
awards. Back in Action requires at least 168 hours between completions.

| ID | Name | Unlock |
| --- | --- | --- |
| first_steps | First Steps | First valid completed challenge |
| game_on | Game On! | First created challenge |
| say_hello | Say Hello! | First nonempty human Family Chat message |
| first_cheer | First Cheer | Comment on a challenge created by another member |
| getting_warm | Getting Warm | Two distinct completion days in one UTC week |
| on_a_roll | On a Roll | Two consecutive qualifying weeks |
| streak_star | Streak Star | Four consecutive qualifying weeks |
| back_in_action | Back in Action | Completion after seven full inactive days |
| high_five | High Five! | React to three distinct updates by other members |
| challenge_buddy | Challenge Buddy | Two members complete the same challenge; both earn it |
| team_player | Team Player | First positive validated team contribution |
| full_house | Full House | Everyone in the family at posting, minimum two, completes within 14 days of creation |
| five_alive | Five Alive | Five completed challenges |
| double_digits | Double Digits | Ten completed challenges |
| challenge_champion | Challenge Champion | Twenty-five completed challenges |
| explorer | Explorer | Three distinct supported activity types |

Explorer normalizes the existing built-in exercise names (including punctuation,
case and common singular/verb forms). Custom activities remain usable but do not
invent additional Explorer categories. Team completion means the member records
a valid contribution, matching existing completedBy participation semantics;
the team goal total remains a separate progress measure.

Full House is stored once for the circle, never assigned to an individual.
Challenges are posted to the whole Family Circle with no participant picker or
challenge join/leave step. Every current member can complete a challenge,
including members who join the Circle later and members excluded from a legacy
participant list. The server records the posting-time family membership for
Full House only; membership changes cannot manufacture that award. Existing
challenges without a reliable whole-family snapshot remain completable but
cannot establish Full House. Previously earned awards remain intact.

## Firebase schema and security

- achievementProfiles/{userId}: familyCircleId, ordered pinnedBadgeIds (0–3),
  state {version, metrics, weeks, categories, lastCompletion, awards}.
- awards[badgeId]: unlockedAt (epoch milliseconds), earnedXp, historical,
  optional celebratedAt (epoch milliseconds).
- familyAchievements/{circleId}: familyCircleId and family-scoped state/awards.
- achievementEvents/{stableEventId}: private idempotency receipts for creation,
  replies, attributed reactions and human chat events. Never client-readable.
- challenges/{id}: server-derived participantIds snapshot, participationScope
  "family", completionTimes[uid] (epoch milliseconds),
  existing completedBy, timestamp and expiresAt.
- replies/{id}: explicit isCompletion plus existing comment/proof/contribution
  fields. Reactions still render as existing emoji counters.
- messages/{id}: new type "achievement" and badgeId; server-only deterministic
  announcement IDs. Human messages also record authenticated authoredBy.
- users/{uid}: server-owned achievementCount for the profile header; legacy
  badges become immutable to clients. Signup creates an empty legacy array.

Firestore rules deny client award, progress, pin, celebration, challenge-create,
completion, family snapshot and reaction writes. Writes go through authenticated
callables, which validate active membership and identity. An active adult may
act only for their own child in the same circle; teen impersonation is denied.
Replies now require family-scoped reads (previously all signed-in users could
read them). Human chat sender/family/type are immutable; forged achievement
messages and edits/deletes of server announcements are denied. Pin ownership,
uniqueness, scope and maximum count are validated transactionally by the server.

The development database was verified as Standard Edition, FIRESTORE_NATIVE,
(default), nam5. No new composite indexes are required: profile reads are by
document ID and backfill uses single familyCircleId equality queries. The
existing messages familyCircleId + timestamp index is reused. Rules are a
prototype prepared for review; emulator verification does not replace reviewing
the production access model before broad release.

## Backend integration

- recordChallenge: validates creation, snapshots the whole family, and atomically saves
  the challenge plus a server-owned creation receipt. Posting confirms after this
  commit; it does not wait for badge evaluation or chat announcements.
- achievementChallengeCreated: retry-enabled creation-receipt trigger; commits
  progress, Game On, announcements and processedAt atomically. Duplicate or delayed
  deliveries cannot award twice. Failed jobs remain retryable independently of the
  posted challenge. Membership changes retain credit quietly without announcing
  to the former circle. Reconciliation consumes pending jobs included in its rebuild.
- recordChallengeReply: validates challenge, expiry, family membership, thread and
  positive finite contribution; writes reply, totals, completion times, XP,
  progress, buddy/family awards and announcements in one transaction.
- recordChallengeReaction: records one attributed reaction per actor/update;
  rejects unsupported emoji and unavailable/cross-family updates; self-reactions
  and updates from departed members cannot progress High Five.
- achievementChatCreated: retry-enabled human-message trigger with a receipt;
  ignores system/achievement/empty messages and invalid current membership.
- updateAchievementProfile: validates ordered earned pins and atomically claims
  recent celebrations across devices.
- reconcileAchievements: app-admin-only bounded family history reconciliation.

All transaction reads happen before writes. The user profile serializes concurrent
awards and receipts serialize repeated activity requests. Unique announcement
IDs are committed with awards and increment existing messageCount. No scans of
challenge history run on ordinary activity. Calendar state retains six weeks;
permanent awards survive pruning. Clients retain pending request IDs in local
storage after a lost response, including team contribution retries.

## UI

BadgeCollection shows featured pins, up to three upcoming achievements sorted by
real persisted progress, earned dates, locked criteria/progress and family wins.
Pin buttons support unpin/replace and keyboard-accessible earlier/later ordering.
ProfileHeader shows the new server-owned badge count plus legacy badges.
AchievementCelebration consolidates simultaneous unlocks in a nonmodal panel
with view/continue actions, a short entrance animation and existing confetti;
reduced motion disables animation/confetti. Only awards younger than two minutes
are claimed, once across devices. Older/offline awards remain in the collection.
Chat shows distinct achievement cards with member avatars and expandable details.
Chat had no announcement-reaction mechanism, so none was added. The existing
optional server-recorded shareAchievements=false preference suppresses individual
announcements; no notification preference is overridden.

Admin Dashboard → Achievement backfill adds a family selector, preview and apply
actions. It uses the same guarded callable as automated reconciliation tests.

## Quiet migration and updated definitions

After an authorized deployment, sign in as an app admin and open the admin
dashboard's **Achievement backfill** tab. Choose a circle, click **Preview
backfill**, review the counts and missing-date notice, then **Apply quiet
backfill**. Repeat for each beta circle. Running it again does not duplicate
awards or messages. Existing pins, award dates and celebration claims survive.

Reliable historical completedBy credits milestones and supported Explorer types.
Records with completionTimes also establish weekly activity and return gaps.
Unknown completion dates do not establish active days; newly granted legacy
completion awards use reconciliation time instead of pretending creation was
completion. Anonymous old reaction counters cannot establish High Five.
Ambiguous old replies without isCompletion=false cannot establish First Cheer.
Full House requires a server-recorded posting-time whole-family snapshot and
reliable completion times; current membership is not substituted for missing
historical data. Historical awards set historical=true and produce
no announcements, XP bonuses or celebrations.

Reconciliation is limited to 50 members and fewer than 2,000 documents in each
queried family collection. It aborts at the limit instead of silently truncating;
larger histories need a paginated migration. Deleted or missing source records
cannot be reconstructed. Already earned awards are retained. Changes to
thresholds can be reconciled through the same preview/apply operation; schema or
metric changes require incrementing state.version and a reviewed migration.

## Validation and manual deployment

Commands (no production deployment was performed):

```powershell
npm run test:achievements
npm --prefix functions run build
npx tsc --noEmit
npm run build
node functions/node_modules/eslint/bin/eslint.js functions/src/achievements/*.ts
npm run test:admin
node --test scripts/profile-calendar.test.mjs scripts/legacy-routes.test.mjs
node scripts/check-secrets.mjs --worktree
```

Isolated rules/concurrency tests (Auth/Firestore emulators, demo project only):

```powershell
npx -y firebase-tools@latest emulators:exec --only firestore,auth --config firebase.emulator.json --project demo-familigo-redesign "node scripts/test-achievements.mjs"
```

16 pure-engine tests cover all badge criteria, UTC boundaries, rest/missed weeks,
return gaps, pins and historical dates. 22 emulator scenarios exercise real
Firestore transactions and rules, concurrent retry/XP safety, scoped messages,
child identity, pin persistence, cross-device claims and quiet reconciliation.
Existing admin/invite and calendar/routing tests also pass. The existing
11-check signup/challenge journey passes through the callables and real
background creation trigger.
New backend files pass lint; repository-wide Functions lint has pre-existing errors in unrelated
files. Vite reports existing browser-data and large-chunk warnings.

Pre-commit review also recorded a bounded scope rules assessment in
`docs/achievement-rules-review.json`. The new human-message validation does not
bound `senderName` length; add a limit and matching client validation before a
broader release. A Functions-emulator run logged an existing notification-helper
failure at `admin.firestore.FieldPath.documentId()` in
`functions/src/utils/notifications.ts`. Push-notification delivery therefore
remains a separate release check; passing badge tests does not verify delivery.
Controlled achievement tests must use only Auth/Firestore, as shown above:
enabling automatic Functions triggers races their manual handler assertions.
The signup journey uses Auth/Firestore/Functions separately.

Production release preparation resolves both findings: notification helpers now
import FieldPath and FieldValue from `firebase-admin/firestore`, with three
regression tests; sender names are limited to 120 characters in the shared
create/update rules validator and the chat client. The operational backfill uses
the shared reconciliation engine with existing IAM credentials and does not
impersonate an app administrator. See `achievement-production-release.md` for
the coordinated release and verification record.

Deploy to development for beta review only when authorized:

```powershell
npm run build:dev
npx -y firebase-tools@latest deploy --only functions:achievementChallengeCreated,functions:reconcileAchievements --config firebase.development.json --project familigo-dev-11643 --non-interactive --force
npx -y firebase-tools@latest deploy --only functions:recordChallenge,functions:recordChallengeReply,functions:recordChallengeReaction,functions:updateAchievementProfile,functions:achievementChatCreated --config firebase.development.json --project familigo-dev-11643 --non-interactive --force
npx -y firebase-tools@latest deploy --only firestore:rules,hosting --config firebase.development.json --project familigo-dev-11643
```

Deploy the background worker before the creation callable, then other functions.
Rules and the matching frontend must be released together
in a coordinated window: older clients use direct writes that the new rules deny.
Then preview/apply quiet backfill per circle. Live deployment, real-device offline
testing and VoiceOver/TalkBack testing remain manual beta release checks. The
code does not expose new public messaging or discovery surfaces.

## Development rollout and endpoint troubleshooting

The six achievement functions, matching Firestore rules and development Hosting
bundle were deployed to **familigo-dev-11643** after the local app reported a
CORS failure calling recordChallenge. The endpoint had not yet been deployed;
the Firebase callable implementation already handles browser CORS. No production
deployment or historical backfill was performed.

The posting performance update was subsequently deployed to the same development
project: achievementChallengeCreated and the reconciliation guard first, followed
by recordChallenge. Challenge confirmation now waits for the challenge/receipt
commit only; badge evaluation and announcements run in the background. No idle
instances were added. Function startup and network latency can still affect the
first post; production latency improvement has not been measured.

Live read-only smoke checks passed for recordChallenge, recordChallengeReply,
recordChallengeReaction, updateAchievementProfile and reconcileAchievements:
localhost:3000 OPTIONS preflights succeed, and unauthenticated POSTs return
UNAUTHENTICATED (HTTP 401). Recheck with:

```powershell
node scripts/check-achievement-endpoints.mjs
```

For a similar CORS failure, first verify the callable exists in the configured
project and region. Release the matching backend before testing a frontend that
depends on it; do not work around missing endpoints with direct Firestore award
writes or no-cors requests. For noninteractive function deployments, the CLI
requires --force to acknowledge the achievement triggers' tested idempotent retry
policy. Keep the --only function list and development project explicit.
