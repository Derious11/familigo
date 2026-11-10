# Performance-only release candidate — November 10, 2026

Base: production main c2be231. Scope: public first paint, auth-only login,
deferred analytics, and dialog-open preparation and batched reads for challenge
writes. The candidate retains production's existing progress calculations, Google
profile schema and weight storage. There are no rule, index, migration, function
export, dependency or database backfill changes.

## Public performance

Firebase development preview channel performance-rc, Hosting version
75f5724e7c114f79. Three cold and three repeat loads per route; fresh mobile
Chrome contexts, 4× CPU slowdown, 150 ms latency, 1.6 Mbps down, worker blocked.

| Route | Cold LCP samples (s) | Cold median | Repeat median |
|---|---|---:|---:|
| Home | 1.116, 1.336, 1.448 | 1.336 s | 0.228 s |
| Login | 0.832, 0.880, 1.008 | 0.880 s | 0.232 s |

Maximum measured CLS was zero; no overflow or page errors in 12 visits.
Preview HTML matched the local dev build. With app JS held, both headings
appeared; the home menu interaction survived handoff and login reached enabled
controls without the private app or Firestore. These are lab results, not field
INP or commercial Google-provider measurements.

## Release boundary

The preview isolates Hosting only. Signed-in validation must use this checkout's
functions and production-baseline rules in isolated emulators, rather than
assuming the shared dev backend has the candidate's data model. The prior
combined dev branch's live function timings are not measurements of this build.

For a later approved production release: confirm main has not drifted, retain
the previous Hosting/Vercel versions and callable source, deploy only
recordChallenge and recordChallengeReply first, verify an actual production
smoke fixture, then deploy the matching client and promote the reviewed branch
to main. Verify login, PWA update, first post, text/photo completion and retry.
Rollback the client first, then restore the two previous function versions.
No data migration, rule deployment, or full functions deployment is required.

## Candidate verification

Frontend type-check, development and production builds, Functions build, 23
achievement/authorization integration checks, and 15 PWA/push/routing tests
passed. Browser tests exercised email login, existing-session redirect, invite
preservation, emulated Google cancellation and successful return with a new
pending profile. A failed challenge post retained the draft and succeeded on
retry. Mobile Chrome captured a frame from a synthetic camera and saved the
photo completion through Storage rules; desktop Chrome saved a text completion.
The browser harness invokes the candidate callable handlers in-process against
the emulator database. Duplicate request and reward behavior was independently
verified in the backend suite. Real-provider/device and production latency checks
remain release smoke checks.
