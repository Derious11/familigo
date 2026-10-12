# Phase 1: default route promotion

The approved design now renders at `/`, `/early-access`, `/login`, and `/app` in the working tree. Marketing links, account links, and successful login navigate to these standard URLs. App tabs, onboarding, pending approval, recoverable errors, and dialogs use the redesigned appearance. Selected icons also apply to the default manifest and initial document.

Preview aliases remain available for existing review links. Older component files, legacy audience pages, and CSS branches remain for the phase-two cleanup; they should not be deleted until their remaining references are checked. No live production deployment was performed.

Validation: production and packaged development builds, TypeScript, six calendar/credential regression checks, and worktree credential scan. Browser review confirmed the new default homepage, signed-in login redirect to `/app`, themed Feed/Chat/Profile/Leaderboard navigation, and New Challenge dialog at `/app`. No challenge, profile, invitation, or chat submissions were made during this route review. The development Hosting preview is refreshed with this phase.

Development and Hosting preview homepages stay non-indexable. Parent enrollment and login stay non-indexable. The production homepage uses `/` as its canonical path and becomes indexable after a separately approved release.

Remaining before release: actual Google sign-in, email delivery, camera/media permissions, real-device review, and production approval. Phase two will consolidate naming/style switches and remove obsolete components/assets; phase one deliberately retains these files.
