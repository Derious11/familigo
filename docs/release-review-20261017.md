# Release review — October 17, 2026 (America/Phoenix)

**Current status (October 26, 2026): the coordinated production rollout completed October 25: functions, Firestore/Storage rules, pagination indexes, Firebase Hosting, and the Vercel public site. Avatar/profile improvements are in production at c2be231. The user reports the original device/journey testing complete. Server-owned progress and scalability improvements are development-only; see [development scalability review](development-scalability-review.md) and [progress rollout](server-owned-progress.md). Performance targets and comprehensive accessibility certification remain open.**

## October 18 continuation (historical; superseded by the current status)

- Read-only field-projected audits of both databases found zero missing/invalid timestamps. Production: 15 messages, 46 challenges, 58 replies. Development: 26 messages, 14 challenges, 28 replies. All challenge expiry fields were valid. No data migration is required for these audited records; results are in `ordering-audit-*.json`.
- Replaced client-side challenge/reply deletion with an authorized callable and durable server jobs. Every transaction handles at most 100 replies; nested threads use persistent tasks. A challenge lock blocks reply/reaction writes during deletion. Retries return the same job; duplicate worker deliveries cannot advance a step twice. Client waits for completion and can retry checking the same job after timeout.
- Actual emulator tests passed for nested children/grandchildren, preserving a sibling, unauthorized deletion, concurrent reply/reaction denial, duplicate delivery, retry, and a 701-reply challenge cascade. Production rollout must deploy the worker/callable and write guards before the new client/rules; pending jobs must finish before rollback of those functions.
- Development additive indexes and deleteFamilyContent, continueContentDeletion, recordChallengeReply, and recordChallengeReaction deployed successfully. A real cloud worker smoke test deleted 101 synthetic replies across bounded batches; all fixture records were cleaned up and no messages were sent. The merged rules compiled; development rules/client have not been rolled out together yet. Production indexes still await the release gate.
- Fixed pagination error handling so a successful update on another page cannot hide a failed listener. Four focused pagination tests pass.
- One-shot family lookup now also chunks member IDs at 30.
- Latest verification: 36 frontend tests and 40 backend tests pass; frontend/backend TypeScript checks, worktree credential scan and whitespace checks pass. Dedicated emulator checks pass for 125-message pagination, access control, media rules, atomic removal/send, and the 701-reply deletion cascade.
- Credential investigation update: the user identified the current Resend key as `familigo_welcomev2`; the provider inventory confirms that name. In-memory comparisons prove the exposed `generateThumbnail` environment value differs from both development and production Secret Manager version 1. Resend explicitly rejects the exposed value as an invalid API key. Therefore the earlier blanket rotation requirement was not supported for the active key: it has been left intact. The raw local metadata export remains sanitized and the worktree scan passes. A configuration-only removal of the obsolete variable from production `generateThumbnail` completed successfully; the function is ACTIVE and the variable is absent. No source/runtime change was requested. The active email functions retain their existing Secret Manager bindings. No email was sent.

## Baseline and preservation

`artifacts/release-review/baseline.json` inventories 189 source/backend/public/script files with size and SHA-256, both dependency manifests, and initial bundle sizes. `initial-status.txt` and `pending-adventure.patch` record the pre-existing tracked adventure changes. The original untracked adventure assets/modules remain in place; their hashes are in the inventory. Review changes overlap History, MainApp, familyService and rules only where integration required it. Adventure scoring, targets, artwork, themes and layout were not rewritten.

Baseline production build and frontend/backend TypeScript checks passed. Existing frontend tests: 32 passed (the secret-scanner test required permission to create its temporary Git repository). Backend tests: 40 passed. The production build warned about large chunks and stale browser compatibility data. The worktree credential scan passed. The initial shell wildcard test invocation failed because Node 20 on Windows does not expand wildcards; rerunning with an explicit file list succeeded.

Read-only production inventories record 21 deployed functions and 3 composite indexes. Several functions still run Node 20 while the local backend targets Node 22; do not assume deployment matches the local build. The development database metadata confirms Standard edition. No deployed functions or stored media were deleted.

## Prioritized findings and implemented batches

| Priority | Finding | Change / evidence | Status |
|---|---|---|---|
| High | Storage allowed any authenticated user to read another family's reply image by path | Challenge-family membership enforced; actual Storage emulator allows a sibling and denies an outsider | Deployed October 25 |
| High | Any family member could delete another member's challenge or reply | Direct client deletion denied; authorized server jobs enforce author/parent ownership and bounded cascades | Deployed October 25; worker and access-control checks passed |
| High | Family admins could set global beta approval | `betaApproved` changes now require the global admin claim | Fixed; emulator denial verified |
| High | Family removal's user update was denied by rules, leaving the core action unusable | Narrow atomic removal rule checks old admin and post-write membership | Fixed; emulator removes both records and denies subsequent access |
| Medium | Feedback allowed another adult's identity and arbitrary internal fields | Author/parent check, allowed fields, initial status/time and text limits | Fixed; valid/forged/oversized emulator cases |
| Medium | Messages could save successfully and then report send failure when unread-count update failed | One atomic batch writes message and counter; composer retains draft until success and blocks duplicate submission | Fixed; actual service and browser tests |
| Medium | Comment failure left the submit control stuck; upload URL failure could leave promises pending | `try/catch/finally`, preserved draft, upload rejection propagation | Fixed; browser failure/retry-state check |
| Medium | Auth async callbacks could publish after sign-out/unmount; missing user snapshot could retain family subscription | Generation guard, subscription cleanup, recovery UI; token claims override profile fields | Fixed locally; broader concurrent-account testing remains |
| Medium | Family document changes refetched every member; unrelated updates restarted feed/chat | Member listeners keyed by membership IDs in groups of 30; cleanup guards; paged query identity uses scalar filters | Fixed; live browser fixture |
| Medium | Chat, challenges, replies and history fetched entire collections | Shared cursor controller, every query `limit(30)`, deterministic timestamp/document-ID ordering, explicit load-more | Deployed October 25; exact production queries verified |
| Medium | Hidden comments/history caused unnecessary reads | Subscribe only when comments/logbook opens | Fixed; history browser check |
| Medium | Eager page imports and app tabs loaded unrelated UI | Lazy public pages, app tabs and modals with accessible loading fallback and existing error boundary | Build and public/browser checks pass; timing gate remains |
| Low | Unreferenced Gemini browser implementation and compatibility barrel | Removed unused services, obsolete unbounded listeners and unused imports; removed `@google/genai` and 56 dependency-tree packages | Reference searches, type/build/credential checks |

Image uploads now reject unsupported types and files over 10 MB on client and server. This is a deliberate validation change. Existing public avatars remain public. Existing Firebase download-token URLs are bearer URLs: tighter Storage rules do **not** revoke previously issued download tokens. Token/media lifecycle review is separate from these rules fixes.

## Pagination behavior and limits

Messages, challenges and replies use 30-document cursor queries. Loaded pages stay subscribed. When insertion/deletion changes a boundary, downstream pages rebase before publishing a consistent list. New bursts retain the previously visible oldest position by loading additional bounded pages; deleted anchors cannot force a scan to the end. Chat preserves its visible message anchor while loading older pages and follows the bottom only when already near it. Family/profile changes remount the app state; unsubscription ignores late callbacks.

Tests cover 95-record in-memory histories and 125 actual Firestore messages, equal timestamps, multiple pages, old edits, deletion, incoming bursts larger than a page, retry and teardown. Actual snapshots never exceeded 30 documents. Loaded pages consume additional live listeners; boundary rebasing can reread downstream pages, so this is **bounded per query**, not constant total session reads. Production billing/request counts have not been measured.

Feed/history still filter active/expired entries within timestamp-ordered loaded pages. Empty-state text now explains when more batches remain; they do not claim the full family history is empty. Expiry transitions and highly interleaved active/expired histories need a dedicated indexed-query improvement. Replies with unloaded parents remain visible; loaded child replies are rendered rather than silently omitted.

**Historical deployment gate (resolved October 25):** production previously lacked the new descending-message and family-scoped reply indexes. `firestore.production.indexes.json` preserves all three observed indexes and adds the required two; `firebase.json` points at it. Required indexes were deployed to both environments before the matching clients; exact production queries succeeded. Emulator success does not verify production composite indexes. The October 18 bounded ordering-field audit found no missing or invalid timestamps in current production/development records. Ordered queries exclude missing fields, so retain this check for future migrations.

## Recorded page and journey coverage

“Source” means reviewed code paths, not proof that every branch works. “Browser” means local desktop Chrome with a 390×844 viewport, not a physical phone.

| Page / journey | Recorded coverage | Still unverified |
|---|---|---|
| `/` | Cold/repeat mobile lab, screenshot, no JS error/overflow | Baseline LCP sample invalid; keyboard/contrast matrix and field vitals |
| `/login` | Public lab; actual synthetic email login into app | Google OAuth, password recovery/support, real devices |
| `/early-access` | Public lab; signup/service source; existing invitation tests | Real signup email/verification delivery, complete form-state matrix |
| `/invite-parent` | Public lab and source path | Actual invitation delivery |
| `/claim-invite` | Public invalid/no-code lab; callable policy tests | Browser valid/expired/used-code matrix and live email links |
| `/faq`, `/privacy`, `/delete-account` | Public lab, screenshots, no JS errors/overflow | Full keyboard/contrast review; deletion is a support-email flow |
| `/design-review` | Development-only route guard retained; existing adventure fixture preserved | Full new screenshot matrix not rerun |
| `/app` Feed | Populated mobile layout, lazy comments, failed comment/draft recovery | Successful completion/photo/camera flow against Functions emulator, active expiry boundary |
| Chat | 30→60 history, scroll anchor, real send, offline-screen draft restoration, emulator access | Physical keyboard/IME, notification launch, large live bursts in browser |
| History / Leaderboard / Adventures | Mobile light/dark layout, logbook on-demand pagination; existing adventure unit suite | Adventure rules suite and launch race not rerun in the dedicated review project |
| Profile / achievements | Mobile layout, family live state; existing achievement backend tests | All edit/weight/pin/modal states, native camera, older-account field limits |
| Onboarding / family switching | Bootstrap/removal rules source; removal emulator; async cleanup changes | Full UI create/join/switch matrix; invitation delivery |
| Admin | Claim guard source + backend admin/invitation policy tests; token-error recovery | Actual admin browser matrix and large production analytics reads |
| PWA / notifications | 11 existing worker/push tests, offline browser recovery | Physical iOS/Android installation, real push delivery, update with open drafts |

Backend export inventory: notification triggers (`onChallengeCreated`, `onReplyCreated`, `onMessageCreated`), storage thumbnail, user-status email trigger, teen email/validation/redemption, adult join, access invite send/redeem/revoke, waitlist approval, admin feedback, challenge/reply/reaction recording, achievement profile updates, achievement chat/challenge processing and reconciliation. Their deployed names/runtimes are in `production-functions.json`. Auth/validation/transaction boundaries were traced in the core callable paths, with 40 existing backend tests. This is not a complete adversarial review of every backend branch.

## Performance evidence

The lab script uses local production preview, Chrome, 390×844, 4× CPU throttle, 150 ms latency and 1.6 Mbps download. Each route has one cold and one repeat visit. Service workers are blocked to isolate page resources. Runs are single samples, include third-party network variance, and are **not** field results or statistical proof of non-regression. INP was not measured. A zero home-page baseline LCP is invalid, not a pass.

| Metric | Baseline | First changed build |
|---|---:|---:|
| Main entry JS, raw | 684.67 KB | 452.97 KB |
| Main entry JS, gzip | 206.06 KB | 146.73 KB |
| Cold homepage JS transfer | 343,278 bytes | 297,069 bytes |
| Login cold LCP | 10.46 s | 10.72 s |
| Early-access cold LCP | 9.22 s | 10.45 s |
| Claim-invite cold LCP | 9.20 s | 6.74 s |
| FAQ cold LCP | 9.40 s | 7.84 s |
| Privacy cold LCP | 9.26 s | 7.61 s |
| Delete-account cold LCP | 8.48 s | 7.14 s |
| Observed CLS | 0 in recorded samples | 0 in recorded samples |

See `baseline-browser.json` and `after-browser.json` for all samples; `final.json` records the final build inventory separately. **LCP ≤2.5 s is not met; no claim is made for INP ≤200 ms or overall non-regression.** Repeat samples are mixed. The worker still precaches all release JS/CSS to preserve complete offline availability; route splitting reduces initial execution, but does not reduce total installation downloads. Firebase and analytics remain major startup costs. Videos range from 3.4–6.3 MB; public URLs were retained because stored content may reference them.

Additional October 18 diagnostic samples (same throttle, single samples): login cold/repeat LCP 5.08/1.568 s; early-access 4.032/1.444 s; CLS 0. These do not replace matched baseline comparisons. Current production build entry: 453.71 KB raw / 147.06 KB gzip. Firebase and entry bundles dominate measured resource transfer time.

## Open findings / release blockers

0. **Resolved credential cleanup:** the exposed environment value is invalid at the provider and differs from current email secrets. `familigo_welcomev2` is preserved. The configuration-only removal from production `generateThumbnail` completed; the function is ACTIVE and the obsolete variable is absent. Sanitizing a local export alone would not revoke a valid credential.
1. **Resolved audit — old-account ordering:** October 18 bounded, read-only scans found valid timestamps throughout current production/development collections. Keep malformed synthetic fixtures and recheck before release if data changes.
2. **Resolved — release correctness:** indexes and coordinated production rules/functions/client rollout completed October 25; exact queries verified.
3. **Implemented — long deletion:** durable server jobs replace the oversized client batch. Nested/concurrent/retry/701-reply emulator tests pass. Cloud worker integration passed with 101 development replies. Coordinated production rollout completed October 25.
4. **Performance gate:** repeat comparable cold/repeat measurements, resolve login/enrollment waterfalls, include service-worker installation/update costs, and obtain field vitals. Current results cannot establish no material regression.
5. **Implemented in development — legacy progress:** server-owned daily rewards and protected fields pass concurrent sign-in/reply and live development checks. Production promotion remains separate.
6. **Implemented in development — large accounts:** explicit admin pagination, archived activity/weight collections, and bounded recent summaries pass large fixtures. Four development profiles were backed up and migrated; production is unchanged.
7. **Coverage:** original device/journey checks reported complete by the user. New automated mobile/desktop keyboard, expiry, draft-retry and offline restoration checks pass. Comprehensive manual contrast/screen-reader review and real-session performance/billing measurements remain open.

## Release checklist and rollback

- [x] Record dirty baseline and retain pending adventure files.
- [x] Inventory source, public assets, dependencies, deployed function names/runtimes and indexes.
- [x] Add focused pagination and rules tests; run browser scroll/draft/history checks.
- [ ] Resolve all open high findings and finish the coverage matrix.
- [x] Confirm no missing ordering fields in current production/development collections; no migration needed.
- [x] Original production pagination indexes deployed and exact queries verified.
- [ ] Test current rules and merged adventure rules on development, including parent/teen/child/outsider cases.
- [x] Original real-device/journey checks reported complete by the user.
- [ ] Repeated performance and field-vitals acceptance remains open.
- [x] Adventure baseline and review changes preserved in separate commits.
- [x] October 25 release passed builds, focused tests and rules checks; subsequent development batches have separate evidence.
- [ ] Run `node scripts/check-secrets.mjs --worktree`, `node scripts/check-secrets.mjs --staged` before commit, and `npm run security:check` before push. Never stage local fixtures/credentials.
- [x] Production release and rollback records retained, including avatar/profile Hosting rollback channels.
- [ ] Publish a production-configured preview, smoke-test public routes and approved adult/teen/child journeys, then promote only after gates pass.
- [ ] Smoke-test production login, onboarding, family isolation, paginated chat/history/replies, posting/retry, admin restrictions, notification navigation and worker update.

Rollback Hosting to the recorded previous release; restore Firestore and Storage rules separately as needed. Hosting rollback does not roll back rules, functions, indexes or data. Additive indexes may stay. Keep previous static chunks available for open tabs/worker users. Never automatically restore a known insecure rule merely to fix client compatibility; prefer rolling back the client while retaining tested restrictive rules. A data migration needs its own backup/rollback plan.
