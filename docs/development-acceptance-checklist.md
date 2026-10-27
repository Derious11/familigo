# Development acceptance checklist — October 27, 2026

Test https://familigo-dev-11643.web.app on iPhone Safari, Android Chrome, and
desktop Chrome. Also repeat the PWA checks in installed iPhone/Android apps.
Use development accounts and record device/OS/browser, test, result, and any
reproduction steps. Production has not received this batch.

## Device acceptance

- [ ] Sign in, sign out, reload, and switch families/profiles. Your own children
  remain selectable; another parent's child cannot be edited. Verify an older
  account and a new account, plus invitation/OAuth entry paths.
- [ ] Reload/open two tabs on the same UTC day: daily XP/streak is awarded only
  once. Complete a challenge concurrently and confirm both legitimate rewards
  persist. Check next-day streak behavior across a UTC day boundary.
- [ ] Post a challenge, including the first post after inactivity; complete it
  with text and a photo. Check reply/reaction, retry after a failed request, and
  absence of duplicate content or rewards. Record first/repeat submission times.
- [ ] Feed shows active challenges, soonest expiry first. History shows expired
  challenges, most recently ended first. Leave a challenge open through expiry;
  it should move automatically. Load multiple pages without gaps/duplicates;
  check scroll stability, back navigation, and family switching.
- [ ] Log weight in each unit; verify summary and history. Interrupt/retry a
  save and confirm only one entry. Test logging for your own child. Older weight
  records remain accessible; missing historical units are explicitly unknown.
- [ ] Expand activity/weight history and load older pages. Check old records,
  unchanged totals, calendar, achievements, and adventure setup/progress.
- [ ] Admin: load more than 50 users/challenges and inspect feedback/invitations/
  audit/families. Search and metrics must clearly describe loaded-only results.
- [ ] Switch tabs repeatedly during a long session; scroll older chat messages,
  receive a new message, and confirm ordering, scroll position, and responsiveness.
- [ ] Go offline while entering weight/post content, reconnect, and retry. Check
  draft retention, clear errors, empty states, and no duplicate submissions.
- [ ] Use keyboard-only navigation on desktop: visible focus, dialog focus trap,
  Escape/close restoration, reachable load-more buttons. Check VoiceOver/TalkBack,
  light/dark contrast, large text, reduced motion, and small-screen touch targets.
- [ ] Installed PWA: launch, background/resume, offline/reconnect, and update from
  the preceding version. Open notification links and verify the intended family
  and content; confirm current content after update/reload.

## Engineering gates before production

- [ ] Capture repeated cold/warm loads, tab switches, and long-session reads/
  listener cleanup on representative large accounts and slow connections.
  Emulator coverage is not proof of real-device latency or billed reads.
- [ ] Compare public LCP/CLS with baseline (targets <=2.5s / <=0.1); measure INP
  (target <=200ms). Distinguish lab results from real-user results. Cold LCP
  previously exceeded target and INP remains unmeasured.
- [ ] Resolve high-severity failures and document any accepted remaining limits.
- [ ] Preview a production history migration and validate legacy records; the
  current migration command is dev-only. Prepare reviewed production tooling,
  private backups, and archive-count/summary checks before any production apply.
- [ ] Prepare coordinated rollout: expiration indexes ready, archive-writing
  functions, matching rules/client, then guarded history migration. Run fresh
  credential checks and confirm the exact tested Git revision.
- [ ] Prepare rollback/forward-fix instructions; never restore clients that write
  protected progress or append legacy weight arrays, or remove archived history.
- [ ] After approved promotion, smoke-test production authentication, challenge
  photo completion, progress, weight/history, family access, and installed PWA.

Automated evidence and deployment details are in
[the scalability review](development-scalability-review.md). Device checks above
remain unchecked until actual results are recorded.
