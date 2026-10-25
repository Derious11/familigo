# Development checkpoint — October 25, 2026

Branch: `codex/release-review-checkpoint`. Production promotion remains gated.

The pending adventure baseline is preserved separately in commit `173a6c6`.
The next commit contains the release-review changes: lazy pages/tabs, bounded
live pagination, access-control hardening, durable content deletion, listener
cleanup, draft/error recovery, and reference-checked removal of unused code.

The newer modal scroll-lock changes and membership audit/repair scripts are
outside this checkpoint. Build and deploy a Git archive of the checkpoint so
those working-tree changes cannot enter the development artifact accidentally.
Local screenshots and account audit artifacts are not staged.

Pre-checkpoint workspace validation passed: frontend/backend TypeScript,
development build, 39 frontend tests, 40 backend tests, worktree credential scan.
Three frontend tests concern the separate scroll-lock changes. Staged credential
checks run before each commit, including the repository hook.

The October 17 review report records detailed findings and historical evidence.
No production application/rules promotion is authorized by passing these checks
alone: complete coordinated development rollout, browser/journey tests, repeated
performance comparisons, and physical iPhone/Android checks first. The user can
test both device platforms. Record results against the deployed revision.

## Completed development rollout

- Review checkpoint commit: `0abd6e9`; the archive build excludes newer working-tree changes.
- Both archive builds passed (development client and backend).
- Isolated archive frontend type checking and all 36 frontend tests passed.
- Deployed `deleteFamilyContent`, `continueContentDeletion`, `recordChallengeReply`,
  and `recordChallengeReaction`, then indexes, then Firestore/Storage rules and Hosting.
- Exact descending timestamp/document-ID queries for messages, challenges and
  replies succeeded against development, confirming composite index readiness.
- The cloud worker completed a synthetic 101-reply cascade; fixtures were removed.
- Hosted development HTML exactly matches the archive build.
- Fresh emulator checks passed: family isolation, feedback identity/limits, media
  rules, atomic removal/send, 125-message live pagination and 701-reply deletion.
- Workspace browser journey checks passed: 30→60 chat anchor preservation, send,
  offline draft recovery, failed-comment retry, tab layout and on-demand history.
  Those local browser checks include the separate modal fix; physical validation
  and hosted checks target the committed archive without that fix.

Device target: https://familigo-dev-11643.web.app. Use the accompanying
`device-checklist-20261025.md`. No production promotion or push was performed.
